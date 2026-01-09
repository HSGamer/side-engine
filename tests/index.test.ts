import { expect, test } from '@rstest/core';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { ProjectShape } from '@seleniumhq/side-model';
import { createProject } from '../src';
import { Builder, Browser } from 'selenium-webdriver';

function loadProjectFromFile(filename: string): ProjectShape {
	const filePath = resolve(__dirname, filename);
	const fileContent = readFileSync(filePath, 'utf-8');
	return JSON.parse(fileContent) as ProjectShape;
}

test('parse test.side file as JSON and map to ProjectShape', () => {
	const project = loadProjectFromFile('test.side');

	expect(project.id).toBeDefined();
	expect(project.version).toBe('3.0');
	expect(project.name).toBe('TestGoogle');
	expect(project.url).toBe('http://www.google.com');
	expect(project.urls).toBeInstanceOf(Array);
	expect(project.plugins).toBeInstanceOf(Array);
	expect(project.suites).toBeInstanceOf(Array);
	expect(project.tests).toBeInstanceOf(Array);
	expect(project.snapshot).toBeDefined();
});

test('createProject works with parsed test.side data', () => {
	const project = loadProjectFromFile('test.side');
	const testProject = createProject(project);

	expect(testProject.project).toEqual(project);
	expect(testProject.getTests()).toHaveLength(1);
	expect(testProject.getTests()[0].name).toBe('New Test');
	expect(testProject.getTestIds()).toEqual({
		'320597bb-1135-4d22-9708-8460aacba17c': 'New Test',
	});
});

test(
	'create and run a test runner from the project',
	async () => {
		const project = loadProjectFromFile('test.side');
		const testProject = createProject(project);

		// Create WebDriver instance for Chromium
		const driver = await new Builder()
			.forBrowser(Browser.CHROME)
			.build();

        const testId = '320597bb-1135-4d22-9708-8460aacba17c';
        const runner = testProject.createRunner(testId, {
            executor: testProject.getWebDriverExecutor({
                driver,
            }),
        });

        expect(runner).toBeDefined();
        expect(runner?.playback).toBeDefined();

        if (runner) {
            let commandCount = 0;
            runner.hookOnCommandEvent(() => {
                commandCount++;
            });

            // Runner is created successfully
            expect(runner.playback).toBeDefined();

            // Run the test
            await runner.run();
        }
	},
	120000
);
