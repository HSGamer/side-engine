import {Playback, PlaybackEvents, PlaybackEventShapes} from "@seleniumhq/side-runtime";

export class TestRunner {
    playback: Playback;
    runner: (playback: Playback) => Promise<any>;

    constructor(playback: Playback, runner: (playback: Playback) => Promise<any>) {
        this.playback = playback;
        this.runner = runner;
    }

    hookOnPlaybackEvent(eventListener: (event: PlaybackEventShapes["PLAYBACK_STATE_CHANGED"]) => void) {
        this.playback["event-emitter"].on(
            PlaybackEvents.PLAYBACK_STATE_CHANGED,
            (event: PlaybackEventShapes["PLAYBACK_STATE_CHANGED"]) => eventListener(event),
        )
    }

    hookOnCommandEvent(eventListener: (event: PlaybackEventShapes["COMMAND_STATE_CHANGED"]) => void) {
        this.playback["event-emitter"].on(
            PlaybackEvents.COMMAND_STATE_CHANGED,
            (event: PlaybackEventShapes["COMMAND_STATE_CHANGED"]) => eventListener(event),
        )
    }

    async run() {
        try {
            await this.runner(this.playback);
        } finally {
            await this.playback.cleanup()
        }
    }

    async stop() {
        await this.playback.stop()
    }

    async abort() {
        await this.playback.stop()
    }
}