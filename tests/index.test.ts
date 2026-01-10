import { expect, test } from '@rstest/core';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ProjectShape } from '@seleniumhq/side-model';
import { createProject, TestLogger } from '../src';
import { Browser, Builder } from 'selenium-webdriver';
import { PlaybackStates } from '@seleniumhq/side-runtime';

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

test('create and run a test runner from the project', async () => {
  const project = loadProjectFromFile('test.side');
  const testProject = createProject(project);

  // Create WebDriver instance for Chromium
  const driver = await new Builder().forBrowser(Browser.CHROME).build();

  const testId = '320597bb-1135-4d22-9708-8460aacba17c';
  const runner = testProject.createRunner(testId, {
    executor: testProject.getWebDriverExecutor({
      driver,
    }),
  });

  expect(runner).toBeDefined();
  expect(runner?.playbackRunner?.playback).toBeDefined();

  if (runner) {
    let commandCount = 0;
    runner.hookOnCommandEvent(() => {
      commandCount++;
    });

    // Runner is created successfully
    expect(runner?.playbackRunner?.runner).toBeDefined();

    // Run the test
    await runner.run();

    expect(commandCount).toBeGreaterThan(0);
  }
}, 120000);

test('create and run a test runner from the project with logger', async () => {
  const project = loadProjectFromFile('test.side');
  const testProject = createProject(project);
  const testLogger = new TestLogger();

  // Create WebDriver instance for Chromium
  const driver = await new Builder().forBrowser(Browser.CHROME).build();

  const testId = '320597bb-1135-4d22-9708-8460aacba17c';
  const runner = testProject.createRunner(testId, {
    logger: testLogger.createConsole(),
    executor: testProject.getWebDriverExecutor({
      driver,
    }),
  });

  expect(runner).toBeDefined();
  expect(runner?.playbackRunner.playback).toBeDefined();

  testLogger.bind(runner!);

  await runner!.run();

  // Save logs, playbackState, and commandStates to a file
  const logOutput = {
    logs: testLogger.logs,
    playbackState: testLogger.playbackState,
    commandStates: testLogger.commandStates,
  };

  const outputPath = resolve(__dirname, 'test-runner-output.json');
  writeFileSync(outputPath, JSON.stringify(logOutput, null, 2));

  // Assertions on the logged data
  expect(testLogger.logs).toBeInstanceOf(Array);
  expect(testLogger.playbackState).toBeInstanceOf(Array);
  expect(testLogger.playbackState.length).toBeGreaterThan(0);
  expect(testLogger.commandStates).toBeInstanceOf(Object);
  expect(Object.keys(testLogger.commandStates).length).toBeGreaterThan(0);

  // Check that playbackState has expected state transitions
  const states = testLogger.playbackState.map((ps) => ps.state);
  expect(states.includes(PlaybackStates.PLAYING)).toBe(true);
  expect(states.includes(PlaybackStates.FINISHED)).toBe(true);
}, 120000);

test('createReport generates a valid test report from logger data', async () => {
  const project = loadProjectFromFile('test.side');
  const testProject = createProject(project);
  const testLogger = new TestLogger();

  // Create WebDriver instance for Chromium
  const driver = await new Builder().forBrowser(Browser.CHROME).build();

  const testId = '320597bb-1135-4d22-9708-8460aacba17c';
  const runner = testProject.createRunner(testId, {
    logger: testLogger.createConsole(),
    executor: testProject.getWebDriverExecutor({
      driver,
    }),
  });

  expect(runner).toBeDefined();
  testLogger.bind(runner!);
  await runner!.run();

  // Generate report
  const report = testProject.createReport(testId, testLogger);

  // Save report to file
  if (report) {
    const reportPath = resolve(__dirname, 'test-report-output.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  expect(report).toBeDefined();
  expect(report?.id).toBe(testId);
  expect(report?.name).toBe(testId);
  expect(report?.state).toBeDefined();
  expect(report?.timestamp).toBeInstanceOf(Array);
  expect(report?.timestamp.length).toBeGreaterThan(0);
  expect(report?.commands).toBeInstanceOf(Array);
  expect(report?.commands.length).toBeGreaterThan(0);
  expect(report?.logs).toBeInstanceOf(Array);

  // Verify command structure
  report?.commands.forEach((cmd) => {
    expect(cmd.id).toBeDefined();
    expect(cmd.command).toBeDefined();
    expect(cmd.state).toBeDefined();
    expect(cmd.timestamp).toBeInstanceOf(Array);
  });
}, 120000);
