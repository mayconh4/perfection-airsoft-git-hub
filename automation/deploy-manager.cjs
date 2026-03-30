const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'deploy.log');

function log(msg) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, line);
    console.log(line);
}

function run(cmd) {
    try {
        log(`Running: ${cmd}`);
        // Use stdio: 'pipe' to capture output for error analysis
        return execSync(cmd, { stdio: 'pipe' }).toString();
    } catch (e) {
        let errorMsg = e.message;
        if (e.stdout) errorMsg += `\nStdout: ${e.stdout.toString()}`;
        if (e.stderr) errorMsg += `\nStderr: ${e.stderr.toString()}`;
        log(`Error: ${errorMsg}`);
        throw e;
    }
}

function main() {
    log('--- STARTING AUTONOMOUS DEPLOY CYCLE ---');
    try {
        // 1. Git Sync
        log('Checking for local changes...');
        const status = run('git status --porcelain');
        if (status) {
            log('Changes detected. Syncing with GitHub...');
            run('git add .');
            // Try to commit, ignore if nothing to commit (though porcelain should handle it)
            try {
                run(`git commit -m "Auto-deploy: ${new Date().toLocaleString()}"`);
            } catch (e) {
                log('Commit failed or nothing to commit. Continuing...');
            }
            log('Pushing to origin...');
            run('git push');
            log('Git sync completed.');
        } else {
            log('No local changes found. Skipping Git sync.');
        }

        // 2. Vercel Deploy
        log('Initiating Vercel Production Deploy...');
        try {
            // --yes to skip confirmations, --prod for production
            run('npx -y vercel --prod --yes');
            log('Vercel deploy command executed successfully.');
        } catch (vError) {
            log('Vercel Deploy failed. Attempting Autonomous Recovery...');
            
            const output = (vError.stdout?.toString() || '') + (vError.stderr?.toString() || '');
            
            if (output.toLowerCase().includes('lint')) {
                log('RECOVERY: Lint error detected. Running fix...');
                try {
                    run('npm run lint -- --fix');
                    log('Lint fix applied. Retrying deploy...');
                    run('npx -y vercel --prod --yes');
                } catch (fixError) {
                    log('RECOVERY FAILED: Could not fix lint errors automatically.');
                    throw fixError;
                }
            } else if (output.toLowerCase().includes('missing') || output.toLowerCase().includes('not found')) {
                log('RECOVERY: Dependency issue detected. Running npm install...');
                run('npm install');
                log('Dependencies updated. Retrying deploy...');
                run('npx -y vercel --prod --yes');
            } else if (output.toLowerCase().includes('tsc') || output.toLowerCase().includes('type')) {
                log('RECOVERY: Type checking failed. Attempting to build without strict types (Risk: High)...');
                // Note: In a real bot, we might avoid this or be more surgical.
                // For now, we log it as a fatal error that needs human eyes if auto-fix isn't obvious.
                log('FATAL: Type errors require manual code adjustment.');
                throw vError;
            } else {
                log(`FATAL: Unrecognized error. Please check logs.`);
                throw vError;
            }
        }

        log('🟢 DEPLOY SUCCESSFUL: Site should be live in 1-2 minutes.');
    } catch (err) {
        log('🔴 DEPLOY CRITICALLY FAILED. Check logs for details.');
        process.exit(1);
    }
}

main();
