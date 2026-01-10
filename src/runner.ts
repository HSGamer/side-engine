import {
  Playback,
  PlaybackEvents,
  PlaybackEventShapes,
} from '@seleniumhq/side-runtime';
import { TestShape } from '@seleniumhq/side-model';
import { TestLogger } from './logger.ts';

export abstract class BaseRunner {
  abstract hookOnPlaybackEvent(
    eventListener: (
      event: PlaybackEventShapes['PLAYBACK_STATE_CHANGED'],
    ) => void,
  ): void;

  abstract hookOnCommandEvent(
    eventListener: (
      event: PlaybackEventShapes['COMMAND_STATE_CHANGED'],
    ) => void,
  ): void;

  abstract run(): Promise<void>;

  abstract stop(): Promise<void>;

  abstract abort(): Promise<void>;
}

export class PlaybackRunner extends BaseRunner {
  playback: Playback;
  runner: (playback: Playback) => Promise<any>;

  constructor(
    playback: Playback,
    runner: (playback: Playback) => Promise<any>,
  ) {
    super();
    this.playback = playback;
    this.runner = runner;
  }

  hookOnPlaybackEvent(
    eventListener: (
      event: PlaybackEventShapes['PLAYBACK_STATE_CHANGED'],
    ) => void,
  ) {
    this.playback['event-emitter'].on(
      PlaybackEvents.PLAYBACK_STATE_CHANGED,
      (event: PlaybackEventShapes['PLAYBACK_STATE_CHANGED']) =>
        eventListener(event),
    );
  }

  hookOnCommandEvent(
    eventListener: (
      event: PlaybackEventShapes['COMMAND_STATE_CHANGED'],
    ) => void,
  ) {
    this.playback['event-emitter'].on(
      PlaybackEvents.COMMAND_STATE_CHANGED,
      (event: PlaybackEventShapes['COMMAND_STATE_CHANGED']) =>
        eventListener(event),
    );
  }

  async run() {
    try {
      await this.runner(this.playback);
    } finally {
      await this.playback.cleanup();
    }
  }

  async stop() {
    await this.playback.stop();
  }

  async abort() {
    await this.playback.stop();
  }
}

export class TestRunner extends BaseRunner {
  test: TestShape;
  playbackRunner: PlaybackRunner;

  constructor(playback: Playback, test: TestShape) {
    super();
    this.test = test;
    this.playbackRunner = new PlaybackRunner(playback, async (p) => {
      let promise = await p.play(test);
      if (promise) {
        await promise();
      }
    });
  }

  abort(): Promise<void> {
    return this.playbackRunner.abort();
  }

  hookOnCommandEvent(
    eventListener: (
      event: PlaybackEventShapes['COMMAND_STATE_CHANGED'],
    ) => void,
  ): void {
    this.playbackRunner.hookOnCommandEvent(eventListener);
  }

  hookOnPlaybackEvent(
    eventListener: (
      event: PlaybackEventShapes['PLAYBACK_STATE_CHANGED'],
    ) => void,
  ): void {
    this.playbackRunner.hookOnPlaybackEvent(eventListener);
  }

  run(): Promise<void> {
    return this.playbackRunner.run();
  }

  stop(): Promise<void> {
    return this.playbackRunner.stop();
  }

  createReport(logger: TestLogger) {
    return logger.createReport(this.test);
  }
}
