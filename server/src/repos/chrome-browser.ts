import { spawn } from 'child_process';
import { existsSync } from 'fs';

export namespace CromeBrowser {
	export function OpenBrowser(url: string = 'https://www.google.com'): void {
		const chromeCandidates = [
			process.env['ProgramFiles']
				? `${process.env['ProgramFiles']}\\Google\\Chrome\\Application\\chrome.exe`
				: undefined,
			process.env['ProgramFiles(x86)']
				? `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`
				: undefined,
			process.env['LOCALAPPDATA']
				? `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`
				: undefined,
			'chrome'
		].filter((candidate): candidate is string => Boolean(candidate));

		for (const chromePath of chromeCandidates) {
			if (chromePath === 'chrome' || existsSync(chromePath)) {
				const child = spawn(chromePath, [url], {
					detached: true,
					stdio: 'ignore',
					shell: false
				});

				child.unref();
				console.log(`Opened Chrome with ${url}`);
				return;
			}
		}

		throw new Error('Google Chrome executable was not found on this machine.');
	}
}

