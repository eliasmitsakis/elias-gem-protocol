import { NextResponse } from 'next/server';

// Server-side execution of user-supplied Python is disabled. The UI runs
// generated code locally in the browser using Pyodide instead.
export async function POST() {
  return NextResponse.json({ error: 'Server-side code execution is disabled.' }, { status: 403 });
}
