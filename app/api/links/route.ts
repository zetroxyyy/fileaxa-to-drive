import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LINKS_PATH = path.join(process.cwd(), 'data', 'links.json');

interface Link {
  id: string;
  title: string;
  filexaUrl: string;
  addedAt: string;
}

async function ensureLinksFile() {
  try {
    await fs.access(LINKS_PATH);
  } catch {
    const dir = path.dirname(LINKS_PATH);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {}
    await fs.writeFile(LINKS_PATH, JSON.stringify([]));
  }
}

export async function GET() {
  try {
    await ensureLinksFile();
    const content = await fs.readFile(LINKS_PATH, 'utf-8');
    const links = JSON.parse(content) as Link[];
    return NextResponse.json(links);
  } catch (error) {
    console.error('Failed to read links:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, filexaUrl } = body;

    if (!title || !filexaUrl) {
      return NextResponse.json(
        { error: 'Missing title or filexaUrl' },
        { status: 400 }
      );
    }

    await ensureLinksFile();
    const content = await fs.readFile(LINKS_PATH, 'utf-8');
    const links = JSON.parse(content) as Link[];

    const newLink: Link = {
      id: Date.now().toString(),
      title,
      filexaUrl,
      addedAt: new Date().toISOString(),
    };

    links.push(newLink);
    await fs.writeFile(LINKS_PATH, JSON.stringify(links, null, 2));

    return NextResponse.json(newLink, { status: 201 });
  } catch (error) {
    console.error('Failed to add link:', error);
    return NextResponse.json(
      { error: 'Failed to add link' },
      { status: 500 }
    );
  }
}
