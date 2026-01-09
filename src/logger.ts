import {CommandState, PlaybackState} from "@seleniumhq/side-runtime";
import {PassThrough} from "node:stream";
import {TestRunner} from "./runner.ts";

export type PlaybackTimestamp = {
    state: PlaybackState;
    timestamp: Date;
}

export type CommandTimestamp = {
    state: CommandState;
    timestamp: Date;
    message?: string;
    error?: Error;
}

export type PlaybackStateListener = (playback: PlaybackTimestamp) => void;

export type CommandStateListener = (id: string, command: CommandTimestamp) => void;

export class TestLogger {
    logs: string[];
    playbackState: PlaybackTimestamp[];
    commandStates: Record<string, CommandTimestamp[]>;
    playbackStateListener: PlaybackStateListener[];
    commandStateListener: CommandStateListener[];

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

        return new console.Console(stream);
    }

    bind(runner: TestRunner) {
        runner.hookOnPlaybackEvent(event => {
            const timestamp = {
                state: event.state,
                timestamp: new Date()
            };
            this.playbackState.push(timestamp);
            if (this.playbackStateListener) {
                this.playbackStateListener.forEach(listener => listener(timestamp));
            }
        });
        runner.hookOnCommandEvent(event => {
            const timestamp = {
                state: event.state,
                message: event.message,
                error: event.error,
                timestamp: new Date()
            };
            (this.commandStates[event.id] ||= []).push(timestamp);
            if (this.commandStateListener) {
                this.commandStateListener.forEach(listener => listener(event.id, timestamp))
            }
        })
    }
}