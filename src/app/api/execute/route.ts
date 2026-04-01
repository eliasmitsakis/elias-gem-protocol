import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = util.promisify(exec);

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'No code provided for execution.' }, { status: 400 });
    }

    // Write code to a temporary file to safely execute without bash string escaping risks
    const tmpFile = path.join(os.tmpdir(), `vibration_${Date.now()}.py`);
    fs.writeFileSync(tmpFile, code);

    try {
      const { stdout, stderr } = await execAsync(`python3 "${tmpFile}"`, { timeout: 10000 });
      return NextResponse.json({
        stdout: stdout || null,
        stderr: stderr || null
      });
    } catch (execError: any) {
      return NextResponse.json({ 
        error: 'Code execution failed or timed out.',
        stderr: execError.stderr ? execError.stderr.toString() : execError.message,
        stdout: execError.stdout ? execError.stdout.toString() : null
       }, { status: 500 });
    } finally {
      // Clean up
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  } catch (error: any) {
    console.error("Execution Request Error:", error);
    return NextResponse.json({ error: 'Invalid request format.' }, { status: 500 });
  }
}
