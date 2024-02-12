export class LineByLineStdoutLogger {
    constructor (delegate) {
        this.delegate = delegate;
    }
    attach (stream) {
        let buffer = '';
        stream.on('data', (chunk) => {
            buffer += chunk.toString();

            let lineEndIndex = buffer.indexOf('\n');

            while (lineEndIndex !== -1) {
                const line = buffer.substring(0, lineEndIndex);

                this.delegate(line);

                buffer = buffer.substring(lineEndIndex + 1);

                lineEndIndex = buffer.indexOf('\n');
            }
        });

        stream.on('end', () => {
            if (buffer.length > 0) {
                this.delegate(buffer);
            }
        });
    }
}
