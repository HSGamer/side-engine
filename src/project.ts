import {ProjectShape, TestShape} from "@seleniumhq/side-model";
import {
    correctPluginPaths,
    CustomCommandShape,
    getCustomCommands,
    loadPlugins,
    Playback,
    Variables,
    WebDriverExecutor
} from "@seleniumhq/side-runtime";
import {PluginRuntimeShape} from "@seleniumhq/side-runtime/dist/types";
import {TestRunner} from "./runner.ts";
import {PlaybackConstructorArgs} from "@seleniumhq/side-runtime/dist/playback";
import {WebDriverExecutorConstructorArgs} from "@seleniumhq/side-runtime/dist/webdriver";

export class TestProject {
    project: ProjectShape;
    plugins: PluginRuntimeShape[];

    constructor(project: ProjectShape, plugins: PluginRuntimeShape[]) {
        this.project = project;
        this.plugins = plugins;
    }

    getCustomCommands(): Record<string, CustomCommandShape> {
        return getCustomCommands(this.plugins)
    }

    getTests(): TestShape[] {
        return this.project.tests;
    }

    getTestIds(): Record<string, string> {
        return Object.fromEntries(
            this.project.tests.map(test => [test.id, test.name])
        );
    }

    getTest(id: string): TestShape | undefined {
        return this.project.tests.find(test => test.id === id);
    }

    getWebDriverExecutor(options?: Partial<WebDriverExecutorConstructorArgs>): WebDriverExecutor {
        return new WebDriverExecutor({
            customCommands: this.getCustomCommands(),
            ...(options || {})
        })
    }

    getPlayback(options?: Partial<PlaybackConstructorArgs>): Playback {
        return new Playback({
            baseUrl: this.project.url,
            executor: options?.executor || this.getWebDriverExecutor(),
            getTestByName: name => this.project.tests.find((t) => t.name == name) as TestShape,
            logger: options?.logger || console,
            variables: options?.variables || new Variables(),
            ...(options || {})
        });
    }

    createRunner(id: string, playbackOptions?: Partial<PlaybackConstructorArgs>): TestRunner | undefined {
        const test = this.getTest(id);
        if (!test) {
            return undefined;
        }

        const playback = this.getPlayback(playbackOptions);
        return new TestRunner(playback, async (p) => {
            let promise = await p.play(test);
            if (promise) {
                await promise();
            }
        })
    }
}

export function createProject(project: ProjectShape) {
    return new TestProject(project, []);
}

export async function createProjectWithPlugins(project: ProjectShape, projectPath: string) {
    const plugins = await loadPlugins(
        correctPluginPaths(projectPath, project.plugins)
    )
    return new TestProject(project, plugins);
}