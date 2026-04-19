import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'No GEMINI_API_KEY' }, { status: 500 });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`
  );
  const data = await res.json();

  // Filter to only image-related models
  const imageModels = (data.models || [])
    .filter((m: { name: string; supportedGenerationMethods?: string[] }) =>
      m.name.toLowerCase().includes('image') ||
      m.name.toLowerCase().includes('imagen') ||
      (m.supportedGenerationMethods || []).includes('generateImage')
    )
    .map((m: { name: string; displayName?: string; supportedGenerationMethods?: string[] }) => ({
      name: m.name,
      displayName: m.displayName,
      methods: m.supportedGenerationMethods,
    }));

  return NextResponse.json({ imageModels, total: data.models?.length });
}
