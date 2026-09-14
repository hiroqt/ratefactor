"use client";

import React from "react";
import { HugeiconsIcon, HugeiconsProps } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Tick01Icon,
  CheckmarkCircle01Icon,
  CheckmarkBadge01Icon,
  CheckCheckIcon,
  Cancel01Icon,
  UserIcon,
  SecurityCheckIcon,
  Bookmark01Icon,
  Settings01Icon,
  Logout01Icon,
  PlusSignIcon,
  StarIcon,
  LinkSquare01Icon,
  ViewIcon,
  Delete01Icon,
  Globe02Icon,
  GithubIcon,
  NewTwitterIcon,
  Linkedin01Icon,
  DocumentCodeIcon,
  Layers01Icon,
  LockKeyIcon,
  Mail01Icon,
  Key01Icon,
  RefreshIcon,
  CodeIcon,
  TerminalIcon,
  Activity01Icon,
  CpuIcon,
  PackageIcon,
  Compass01Icon,
  SmileIcon,
  Briefcase01Icon,
  Edit01Icon,
  FireIcon,
  Award01Icon,
  Comment01Icon,
  PinIcon,
  FilterHorizontalIcon,
  Search01Icon,
  Copy01Icon,
  InformationCircleIcon,
  Alert01Icon,
  AlertCircleIcon,
  FolderSearchIcon,
  WifiDisconnected01Icon,
  Notification01Icon,
  FavouriteIcon,
  Building01Icon,
  Location01Icon,
  Image01Icon,
  Loading01Icon,
  FlashIcon,
  Clock01Icon,
  BookOpen01Icon,
  DashboardSquare01Icon,
  Sorting01Icon,
  Menu01Icon,
  CommandIcon,
  Folder01Icon,
  Shield01Icon,
  ListIcon,
  FilterIcon,
  LayoutTwoColumnIcon,
  Upload01Icon,
  Link01Icon,
  SendIcon,
  Flag01Icon,
  ViewOffSlashIcon,
  KeyRoundIcon,
  Calendar01Icon,
  Share01Icon,
  TrophyIcon,
  CircleDotIcon,
  Sun01Icon,
  Moon01Icon,
} from "@hugeicons/core-free-icons";

export interface IconProps extends Omit<HugeiconsProps, "icon"> {
  className?: string;
  size?: number | string;
}

function createIcon(iconData: any, displayName: string) {
  const IconComponent = React.forwardRef<SVGSVGElement, IconProps>(
    ({ className, size = 16, strokeWidth = 1.5, ...props }, ref) => {
      return (
        <HugeiconsIcon
          ref={ref}
          icon={iconData}
          size={size}
          strokeWidth={strokeWidth}
          className={className}
          {...props}
        />
      );
    }
  );
  IconComponent.displayName = displayName;
  return IconComponent;
}

// Hugeicons mappings replacing Lucide
export const ArrowLeft = createIcon(ArrowLeft01Icon, "ArrowLeft");
export const ArrowRight = createIcon(ArrowRight01Icon, "ArrowRight");
export const ArrowDown = createIcon(ArrowDown01Icon, "ArrowDown");
export const ArrowUp = createIcon(ArrowUp01Icon, "ArrowUp");
export const ArrowUpRight = createIcon(ArrowUpRight01Icon, "ArrowUpRight");
export const ArrowUpDown = createIcon(Sorting01Icon, "ArrowUpDown");
export const ChevronLeft = createIcon(ArrowLeft01Icon, "ChevronLeft");
export const ChevronRight = createIcon(ArrowRight01Icon, "ChevronRight");
export const ChevronUp = createIcon(ArrowUp01Icon, "ChevronUp");
export const ChevronDown = createIcon(ArrowDown01Icon, "ChevronDown");

export const Check = createIcon(Tick01Icon, "Check");
export const CheckCheck = createIcon(CheckCheckIcon, "CheckCheck");
export const CheckCircle = createIcon(CheckmarkCircle01Icon, "CheckCircle");
export const CheckCircle2 = createIcon(CheckmarkCircle01Icon, "CheckCircle2");
export const CheckBadge = createIcon(CheckmarkBadge01Icon, "CheckBadge");
export const X = createIcon(Cancel01Icon, "X");

export const User = createIcon(UserIcon, "User");
export const ShieldCheck = createIcon(SecurityCheckIcon, "ShieldCheck");
export const Bookmark = createIcon(Bookmark01Icon, "Bookmark");
export const Settings = createIcon(Settings01Icon, "Settings");
export const LogOut = createIcon(Logout01Icon, "LogOut");
export const Plus = createIcon(PlusSignIcon, "Plus");
export const Star = createIcon(StarIcon, "Star");
export const ExternalLink = createIcon(LinkSquare01Icon, "ExternalLink");
export const Eye = createIcon(ViewIcon, "Eye");
export const Trash2 = createIcon(Delete01Icon, "Trash2");
export const Globe = createIcon(Globe02Icon, "Globe");
export const Github = createIcon(GithubIcon, "Github");
export const Twitter = createIcon(NewTwitterIcon, "Twitter");
export const Linkedin = createIcon(Linkedin01Icon, "Linkedin");
export const FileText = createIcon(DocumentCodeIcon, "FileText");
export const Layers = createIcon(Layers01Icon, "Layers");
export const Lock = createIcon(LockKeyIcon, "Lock");
export const Mail = createIcon(Mail01Icon, "Mail");
export const Key = createIcon(Key01Icon, "Key");
export const RefreshCw = createIcon(RefreshIcon, "RefreshCw");
export const Code = createIcon(CodeIcon, "Code");
export const Code2 = createIcon(DocumentCodeIcon, "Code2");
export const Terminal = createIcon(TerminalIcon, "Terminal");
export const Activity = createIcon(Activity01Icon, "Activity");
export const Cpu = createIcon(CpuIcon, "Cpu");
export const Boxes = createIcon(PackageIcon, "Boxes");
export const Compass = createIcon(Compass01Icon, "Compass");
export const Smile = createIcon(SmileIcon, "Smile");
export const Briefcase = createIcon(Briefcase01Icon, "Briefcase");
export const Edit = createIcon(Edit01Icon, "Edit");
export const Edit3 = createIcon(Edit01Icon, "Edit3");
export const Flame = createIcon(FireIcon, "Flame");
export const Award = createIcon(Award01Icon, "Award");
export const MessageSquare = createIcon(Comment01Icon, "MessageSquare");
export const Pin = createIcon(PinIcon, "Pin");
export const SlidersHorizontal = createIcon(FilterHorizontalIcon, "SlidersHorizontal");
export const Sliders = createIcon(FilterHorizontalIcon, "Sliders");
export const Search = createIcon(Search01Icon, "Search");
export const Copy = createIcon(Copy01Icon, "Copy");
export const Info = createIcon(InformationCircleIcon, "Info");
export const AlertTriangle = createIcon(Alert01Icon, "AlertTriangle");
export const AlertCircle = createIcon(AlertCircleIcon, "AlertCircle");
export const FolderSearch = createIcon(FolderSearchIcon, "FolderSearch");
export const WifiOff = createIcon(WifiDisconnected01Icon, "WifiOff");
export const Bell = createIcon(Notification01Icon, "Bell");
export const Heart = createIcon(FavouriteIcon, "Heart");
export const Building2 = createIcon(Building01Icon, "Building2");
export const MapPin = createIcon(Location01Icon, "MapPin");
export const Image = createIcon(Image01Icon, "Image");
export const ImageIcon = createIcon(Image01Icon, "ImageIcon");
export const Loader2 = createIcon(Loading01Icon, "Loader2");
export const Zap = createIcon(FlashIcon, "Zap");
export const Clock = createIcon(Clock01Icon, "Clock");
export const BookOpen = createIcon(BookOpen01Icon, "BookOpen");
export const LayoutGrid = createIcon(DashboardSquare01Icon, "LayoutGrid");
export const ListFilter = createIcon(FilterHorizontalIcon, "ListFilter");
export const Users = createIcon(UserIcon, "Users");
export const Menu = createIcon(Menu01Icon, "Menu");
export const Command = createIcon(CommandIcon, "Command");
export const PlusCircle = createIcon(PlusSignIcon, "PlusCircle");
export const Folder = createIcon(Folder01Icon, "Folder");
export const Shield = createIcon(Shield01Icon, "Shield");
export const List = createIcon(ListIcon, "List");
export const Filter = createIcon(FilterIcon, "Filter");
export const Columns = createIcon(LayoutTwoColumnIcon, "Columns");
export const Upload = createIcon(Upload01Icon, "Upload");
export const Link = createIcon(Link01Icon, "Link");
export const Send = createIcon(SendIcon, "Send");
export const Flag = createIcon(Flag01Icon, "Flag");
export const EyeOff = createIcon(ViewOffSlashIcon, "EyeOff");
export const KeyRound = createIcon(KeyRoundIcon, "KeyRound");
export const Calendar = createIcon(Calendar01Icon, "Calendar");
export const Share2 = createIcon(Share01Icon, "Share2");
export const Trophy = createIcon(TrophyIcon, "Trophy");
export const CircleDot = createIcon(CircleDotIcon, "CircleDot");
export const Sun = createIcon(Sun01Icon, "Sun");
export const Moon = createIcon(Moon01Icon, "Moon");

export const Google = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement> & { size?: number | string }>(
  ({ className = "w-4 h-4", size, ...props }, ref) => (
    <svg
      ref={ref}
      className={className}
      width={size || undefined}
      height={size || undefined}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  )
);
Google.displayName = "Google";

