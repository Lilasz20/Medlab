// Declaration file for Prisma types
declare module "@prisma/client" {
  import { PrismaClientOptions } from "@prisma/client/runtime/library";

  export * from "@prisma/client/runtime/library";

  export declare class PrismaClient {
    constructor(options?: PrismaClientOptions);

    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $on(eventType: string, callback: (event: any) => void): void;
    $transaction<R>(
      action: (prisma: PrismaClient) => Promise<R>,
      options?: { maxWait?: number; timeout?: number; isolationLevel?: any }
    ): Promise<R>;
    $transaction<R>(queries: Array<any>): Promise<R>;

    // Add your model types here if needed
    user: any;
    patient: any;
    test: any;
    testAssignment: any;
    sample: any;
    invoice: any;
    invoiceItem: any;
    queueNumber: any;
    report: any;
  }
}
