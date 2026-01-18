import type {ProjectShape, TestShape} from '@seleniumhq/side-model';
import {
  correctPluginPaths,
  type CustomCommandShape,
  getCustomCommands,
  loadPlugins,
  Playback,
  Variables,
  WebDriverExecutor,
} from '@seleniumhq/side-runtime';
import type {PlaybackConstructorArgs} from '@seleniumhq/side-runtime/dist/playback';
import type {PluginRuntimeShape} from '@seleniumhq/side-runtime/dist/types';
import type {WebDriverExecutorConstructorArgs} from '@seleniumhq/side-runtime/dist/webdriver';
import type {TestLogger} from './logger.ts';
import type {TestReport} from './types.ts';
import {TestRunner} from "./runner";

export class TestProject {
    project: ProjectShape;
    plugins: PluginRuntimeShape[];

    constructor(project: ProjectShape, plugins: PluginRuntimeShape[]) {
        this.project = project;
        this.plugins = plugins;
    }

    static createProject(project: ProjectShape) {
        return new TestProject(project, []);
    }

    static async createProjectWithPlugins(
        project: ProjectShape,
        projectPath: string,
    ) {
        const plugins = await loadPlugins(
            correctPluginPaths(projectPath, project.plugins),
        );
        return new TestProject(project, plugins);
    }

    getCustomCommands(): Record<string, CustomCommandShape> {
        return getCustomCommands(this.plugins);
    }

    getTests(): TestShape[] {
        return this.project.tests;
    }

    getTestIds(): Record<string, string> {
        return Object.fromEntries(
            this.project.tests.map((test) => [test.id, test.name]),
        );
    }

    getTest(id: string): TestShape | undefined {
        return this.project.tests.find((test) => test.id === id);
    }

    getWebDriverExecutor(
        options?: Partial<WebDriverExecutorConstructorArgs>,
    ): WebDriverExecutor {
        return new WebDriverExecutor({
            customCommands: this.getCustomCommands(),
            ...(options || {}),
        });
    }

    getPlayback(options?: Partial<PlaybackConstructorArgs>): Playback {
        return new Playback({
            baseUrl: this.project.url,
            executor: options?.executor || this.getWebDriverExecutor(),
            getTestByName: (name) =>
                this.project.tests.find((t) => t.name === name) as TestShape,
            logger: options?.logger || console,
            variables: options?.variables || new Variables(),
            ...(options || {}),
        });
    }

    createRunner(
        id: string,
        playbackOptions?: Partial<PlaybackConstructorArgs>,
    ): TestRunner | undefined {
        const test = this.getTest(id);
        if (!test) {
            return undefined;
        }

        const playback = this.getPlayback(playbackOptions);
        return new TestRunner(playback, test);
    }

    createReport(id: string, logger: TestLogger): TestReport | undefined {
        const test = this.getTest(id);
        if (!test) {
            return undefined;
        }
        return logger.createReport(test);
    }
}
