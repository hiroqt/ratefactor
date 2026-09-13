// Type definitions for WebGPU API
interface Navigator {
  gpu?: {
    requestAdapter(options?: any): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): string;
  };
}

interface GPUAdapter {
  requestDevice(descriptor?: any): Promise<GPUDevice>;
}

interface GPUDevice {
  destroy(): void;
  createBuffer(descriptor: any): any;
  createShaderModule(descriptor: any): any;
  createRenderPipelineAsync(descriptor: any): Promise<any>;
  createBindGroup(descriptor: any): any;
  createCommandEncoder(descriptor?: any): any;
  createTexture(descriptor: any): any;
  createSampler(descriptor?: any): any;
  queue: {
    writeBuffer(buffer: any, bufferOffset: number, data: BufferSource, dataOffset?: number, size?: number): void;
    submit(commandBuffers: any[]): void;
  };
  lost: Promise<{ message?: string; reason?: string }>;
  limits: {
    maxTextureDimension2D: number;
    [key: string]: any;
  };
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

interface GPUCanvasContext {
  configure(configuration: { device: GPUDevice; format: string; alphaMode?: string }): void;
  unconfigure(): void;
  getCurrentTexture(): {
    createView(): any;
  };
}

interface GPUTexture {
  width: number;
  height: number;
  destroy(): void;
  createView(descriptor?: any): GPUTextureView;
}

interface GPUTextureView {}
interface GPUBindGroup {}

interface GPUUncapturedErrorEvent extends Event {
  error: { message: string };
}

declare const GPUBufferUsage: {
  MAP_READ: number;
  MAP_WRITE: number;
  COPY_SRC: number;
  COPY_DST: number;
  INDEX: number;
  VERTEX: number;
  UNIFORM: number;
  STORAGE: number;
  INDIRECT: number;
  QUERY_RESOLVE: number;
};

declare const GPUTextureUsage: {
  COPY_SRC: number;
  COPY_DST: number;
  TEXTURE_BINDING: number;
  STORAGE_BINDING: number;
  RENDER_ATTACHMENT: number;
};
