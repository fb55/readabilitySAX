declare module "minreq" {
    interface MinreqOptions {
        uri: string;
        only2xx?: boolean;
        headers?: Record<string, string>;
    }

    interface MinreqResponse {
        headers: Record<string, string>;
    }

    interface MinreqRequest {
        response: {
            location: string;
        };
        on(
            event: "error",
            callback: (error: Error | string) => void
        ): MinreqRequest;
        on(
            event: "response",
            callback: (response: MinreqResponse) => void
        ): MinreqRequest;
        pipe(stream: NodeJS.WritableStream): void;
    }

    export default function minreq(options: MinreqOptions): MinreqRequest;
}
