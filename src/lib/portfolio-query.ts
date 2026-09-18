/**
 * Pure builder for the parameterized WHERE clause used by
 * GET /api/portfolios. Extracted from the route handler so the filter
 * composition (category + domain + host + search, all together) has a
 * direct, mock-free test target instead of only being exercisable through
 * a live Postgres connection.
 */
export interface PortfolioQueryFilters {
  category?: string; // "All" (or omitted) means no category filter
  domain?: string; // falsy means no domain filter
  hostParam?: string; // "all" (or omitted) means no host filter
  query?: string;
}

export interface PortfolioQueryResult {
  whereClause: string;
  filterValues: (string | number)[];
}

const HOSTNAME_EXPR =
  "LOWER(REGEXP_REPLACE(SPLIT_PART(REGEXP_REPLACE(COALESCE(p.portfolio_url, ''), '^[a-zA-Z][a-zA-Z0-9+.-]*://', ''), '/', 1), ':[0-9]+$', ''))";

function likeValue(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function buildPortfolioWhereClause(filters: PortfolioQueryFilters): PortfolioQueryResult {
  const category = filters.category || "All";
  const domain = filters.domain || "";
  const hostParam = (filters.hostParam || "").toLowerCase().trim();
  const query = (filters.query || "").toLowerCase().trim();

  const clauses = ["p.status = 'published'"];
  const filterValues: (string | number)[] = [];
  const addFilter = (sql: string, value: string) => {
    filterValues.push(value);
    clauses.push(sql.replace("?", `$${filterValues.length}`));
  };

  if (category !== "All") addFilter("p.category::text = ?", category);
  if (domain) addFilter("p.domains @> ARRAY[?]::text[]", domain);

  if (hostParam && hostParam !== "all") {
    const hostValue = likeValue(hostParam);
    if (hostParam.startsWith(".")) {
      filterValues.push(hostValue, hostValue);
      clauses.push(
        `(${HOSTNAME_EXPR} LIKE $${filterValues.length - 1} ESCAPE '\\' OR LOWER(COALESCE(p.portfolio_url, '')) LIKE $${filterValues.length} ESCAPE '\\')`
      );
    } else {
      addFilter(`${HOSTNAME_EXPR} LIKE ? ESCAPE '\\'`, hostValue);
    }
  }

  if (query) {
    const queryValue = likeValue(query);
    filterValues.push(queryValue);
    const queryParam = `$${filterValues.length}`;
    clauses.push(`(
      LOWER(COALESCE(p.title, '')) LIKE ${queryParam} ESCAPE '\\'
      OR LOWER(COALESCE(p.tagline, '')) LIKE ${queryParam} ESCAPE '\\'
      OR LOWER(COALESCE(p.description, '')) LIKE ${queryParam} ESCAPE '\\'
      OR LOWER(COALESCE(pr.full_name, '')) LIKE ${queryParam} ESCAPE '\\'
      OR LOWER(COALESCE(pr.username, '')) LIKE ${queryParam} ESCAPE '\\'
      OR LOWER(COALESCE(p.category::text, '')) LIKE ${queryParam} ESCAPE '\\'
      OR ${HOSTNAME_EXPR} LIKE ${queryParam} ESCAPE '\\'
      OR LOWER(COALESCE(p.portfolio_url, '')) LIKE ${queryParam} ESCAPE '\\'
      OR LOWER(COALESCE(p.demo_url, '')) LIKE ${queryParam} ESCAPE '\\'
      OR LOWER(COALESCE(p.tech_stack::text, '')) LIKE ${queryParam} ESCAPE '\\'
    )`);
  }

  return { whereClause: clauses.join(" AND "), filterValues };
}
