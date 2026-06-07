import { supabase } from '../lib/supabase.js';
import { AppError } from '../utils/appError.js';

export type LegalDocumentId = 'terms' | 'guidelines';

export interface LegalSectionDto {
  title: string;
  body: string[];
}

export interface LegalDocumentDto {
  title: string;
  intro: string;
  safetyNote: string;
  sections: LegalSectionDto[];
  footer: string;
}

interface LegalDocumentRow {
  id: string;
  title: string;
  intro: string;
  safety_note: string;
  footer: string;
  sections: Array<{ title: string; body: string[] }>;
}

function mapRow(row: LegalDocumentRow): LegalDocumentDto {
  return {
    title: row.title,
    intro: row.intro,
    safetyNote: row.safety_note,
    footer: row.footer,
    sections: (row.sections ?? []).map((section) => ({
      title: section.title,
      body: section.body ?? [],
    })),
  };
}

export async function getLegalDocument(id: LegalDocumentId): Promise<LegalDocumentDto> {
  const { data, error } = await supabase
    .from('legal_documents')
    .select('id, title, intro, safety_note, footer, sections')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (/legal_documents/i.test(error.message)) {
      throw new AppError(
        500,
        'LEGAL_SCHEMA_MISSING',
        'Legal documents table is missing. Run sql/018_legal_documents.sql in Supabase.',
      );
    }
    throw new AppError(500, 'LEGAL_READ_FAILED', error.message);
  }

  if (!data) {
    throw new AppError(404, 'LEGAL_DOCUMENT_NOT_FOUND', 'Legal document not found');
  }

  return mapRow(data as LegalDocumentRow);
}
