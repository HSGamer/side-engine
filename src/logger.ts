import {PassThrough} from 'node:stream';
import {Console} from 'node:console';
import type {BaseRunner} from './runner.ts';
import type {CommandTimestamp, PlaybackTimestamp, TestReport} from './types.ts';
import type {TestShape} from '@seleniumhq/side-model';
import {CommandStates, PlaybackStates} from '@seleniumhq/side-runtime';

export type PlaybackStateListener = (playback: PlaybackTimestamp) => void;

export type CommandStateListener = (
    id: string,
    command: CommandTimestamp,
) => void;

export class TestLogger {
    logs: string[];
    playbackState: PlaybackTimestamp[];
    commandStates: Record<string, CommandTimestamp[]>;
    private readonly playbackStateListener: PlaybackStateListener[];
    private readonly commandStateListener: CommandStateListener[];

    constructor() {
        this.logs = [];
        this.playbackState = [];
        this.commandStates = {};
        this.playbackStateListener = [];
        this.commandStateListener = [];
    }

    addPlaybackStateListener(listener: PlaybackStateListener): void {
        this.playbackStateListener.push(listener);
    }

    addCommandStateListener(listener: CommandStateListener): void {
        this.commandStateListener.push(listener);
    }

    createConsole(): Console {
        const stream = new PassThrough();
        let buffer = '';

        stream.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();

            const lines = buffer.split('\n');
            // Keep the last element as buffer (might be incomplete line)
            buffer = lines.pop() || '';

            // Add complete lines to logs
            this.logs.push(...lines);
        });

        stream.on('end', () => {
            // Flush remaining buffer when stream ends
            if (buffer) {
                this.logs.push(buffer);
            }
        });

        return new Console({stdout: stream});
    }

    bind(runner: BaseRunner) {
        runner.hookOnPlaybackEvent((event) => {
            const timestamp = {
                state: event.state,
                timestamp: new Date(),
            };
            this.playbackState.push(timestamp);
            if (this.playbackStateListener) {
                this.playbackStateListener.forEach((listener) => listener(timestamp));
            }
        });
        runner.hookOnCommandEvent((event) => {
            const timestamp = {
                state: event.state,
                message: event.message,
                error: event.error,
                timestamp: new Date(),
            };
            (this.commandStates[event.id] ||= []).push(timestamp);
            if (this.commandStateListener) {
                this.commandStateListener.forEach((listener) =>
                    listener(event.id, timestamp),
                );
            }
        });
    }

    createReport(test: TestShape): TestReport {
        return {
            id: test.id,
            name: test.name,
            timestamp: this.playbackState,
            commands: test.commands.map((c) => ({
                id: c.id,
                command: c,
                timestamp: this.commandStates[c.id] || [],
                state:
                    this.commandStates[c.id]?.at(-1)?.state || CommandStates.UNDETERMINED,
            })),
            logs: this.logs,
            state: this.playbackState.at(-1)?.state || PlaybackStates.ERRORED,
        };
    }
}
