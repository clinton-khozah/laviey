import { supabase } from '../lib/supabase.js';
import { createSupabaseUserClient } from '../lib/supabase.user.js';
import { AppError } from '../utils/appError.js';
import type { AuthUser } from '../types/api.types.js';

export interface OnboardingOptionDto {
  key: string;
  label: string;
  hint: string;
  emoji: string;
  sortOrder: number;
}

export interface OnboardingQuestionDto {
  stepKey: string;
  kind: 'single' | 'multi' | 'input';
  sortOrder: number;
  heroEmoji: string;
  title: string;
  subtitle: string;
  minSelections: number | null;
  maxSelections: number | null;
  options: OnboardingOptionDto[];
}

export interface SubmitOnboardingInput {
  purpose: string;
  agePreference: string;
  interestedIn: string;
  orientation: string;
  religion: string;
  interests: string[];
  dateOfBirth: string;
  vibe?: 'chill' | 'bold' | 'fun';
  location: {
    latitude: number;
    longitude: number;
    country: string;
    province: string;
    suburb: string;
  };
}

export interface UserOnboardingStatusDto {
  completed: boolean;
  completedAt: string | null;
}

interface QuestionRow {
  id: string;
  step_key: string;
  kind: 'single' | 'multi' | 'input';
  sort_order: number;
  hero_emoji: string;
  title: string;
  subtitle: string;
  min_selections: number | null;
  max_selections: number | null;
}

interface OptionRow {
  question_id: string;
  option_key: string;
  label: string;
  hint: string;
  emoji: string;
  sort_order: number;
}

export async function listQuestions(): Promise<OnboardingQuestionDto[]> {
  const { data: questions, error: questionsError } = await supabase
    .from('onboarding_questions')
    .select('id, step_key, kind, sort_order, hero_emoji, title, subtitle, min_selections, max_selections')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (questionsError) {
    throw new AppError(500, 'ONBOARDING_QUESTIONS_READ_FAILED', questionsError.message);
  }

  const rows = (questions ?? []) as QuestionRow[];
  if (rows.length === 0) return [];

  const questionIds = rows.map((q) => q.id);
  const { data: options, error: optionsError } = await supabase
    .from('onboarding_options')
    .select('question_id, option_key, label, hint, emoji, sort_order')
    .in('question_id', questionIds)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (optionsError) {
    throw new AppError(500, 'ONBOARDING_OPTIONS_READ_FAILED', optionsError.message);
  }

  const optionsByQuestion = new Map<string, OnboardingOptionDto[]>();
  for (const opt of (options ?? []) as OptionRow[]) {
    const list = optionsByQuestion.get(opt.question_id) ?? [];
    list.push({
      key: opt.option_key,
      label: opt.label,
      hint: opt.hint ?? '',
      emoji: opt.emoji ?? '',
      sortOrder: opt.sort_order,
    });
    optionsByQuestion.set(opt.question_id, list);
  }

  return rows.map((q) => ({
    stepKey: q.step_key,
    kind: q.kind,
    sortOrder: q.sort_order,
    heroEmoji: q.hero_emoji,
    title: q.title,
    subtitle: q.subtitle,
    minSelections: q.min_selections,
    maxSelections: q.max_selections,
    options: optionsByQuestion.get(q.id) ?? [],
  }));
}

export async function listInterestOptions(): Promise<OnboardingOptionDto[]> {
  const catalog = await listQuestions();
  const interests = catalog.find((step) => step.stepKey === 'interests');
  return interests?.options ?? [];
}

async function resolveOptionId(
  stepKey: string,
  optionKey: string,
  accessToken: string,
): Promise<string> {
  const client = createSupabaseUserClient(accessToken);
  const { data, error } = await client.rpc('resolve_onboarding_option_id', {
    p_step_key: stepKey,
    p_option_key: optionKey,
  });

  if (error) {
    throw new AppError(400, 'INVALID_ONBOARDING_OPTION', `${stepKey}/${optionKey}: ${error.message}`);
  }

  if (!data) {
    throw new AppError(400, 'INVALID_ONBOARDING_OPTION', `Unknown option ${optionKey} for ${stepKey}`);
  }

  return data as string;
}

export async function getUserOnboardingStatus(
  userId: string,
  accessToken: string,
): Promise<UserOnboardingStatusDto> {
  const client = createSupabaseUserClient(accessToken);
  const { data, error } = await client
    .from('user_onboarding_responses')
    .select('completed_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, 'ONBOARDING_STATUS_READ_FAILED', error.message);
  }

  return {
    completed: Boolean(data),
    completedAt: (data?.completed_at as string | null) ?? null,
  };
}

export async function submitUserOnboarding(
  authUser: AuthUser,
  accessToken: string,
  input: SubmitOnboardingInput,
): Promise<UserOnboardingStatusDto> {
  if (input.interests.length < 3) {
    throw new AppError(400, 'ONBOARDING_INTERESTS_MIN', 'Select at least 3 interests');
  }

  const client = createSupabaseUserClient(accessToken);
  const vibe = input.vibe ?? 'chill';

  const [
    purposeOptionId,
    agePreferenceOptionId,
    interestedInOptionId,
    orientationOptionId,
    religionOptionId,
  ] = await Promise.all([
    resolveOptionId('purpose', input.purpose, accessToken),
    resolveOptionId('age_preference', input.agePreference, accessToken),
    resolveOptionId('interested_in', input.interestedIn, accessToken),
    resolveOptionId('orientation', input.orientation, accessToken),
    resolveOptionId('religion', input.religion, accessToken),
  ]);

  const interestOptionIds = await Promise.all(
    input.interests.map((key) => resolveOptionId('interests', key, accessToken)),
  );

  const payload = {
    user_id: authUser.id,
    purpose_option_id: purposeOptionId,
    age_preference_option_id: agePreferenceOptionId,
    interested_in_option_id: interestedInOptionId,
    orientation_option_id: orientationOptionId,
    religion_option_id: religionOptionId,
    date_of_birth: input.dateOfBirth,
    vibe,
    completed_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await client
    .from('user_onboarding_responses')
    .select('id')
    .eq('user_id', authUser.id)
    .maybeSingle();

  if (existingError) {
    throw new AppError(500, 'ONBOARDING_READ_FAILED', existingError.message);
  }

  let responseId: string;

  if (existing?.id) {
    const { data: updated, error: updateError } = await client
      .from('user_onboarding_responses')
      .update(payload)
      .eq('user_id', authUser.id)
      .select('id, completed_at')
      .single();

    if (updateError || !updated) {
      throw new AppError(500, 'ONBOARDING_UPDATE_FAILED', updateError?.message ?? 'Update failed');
    }

    responseId = updated.id as string;

    const { error: deleteInterestsError } = await client
      .from('user_onboarding_interests')
      .delete()
      .eq('response_id', responseId);

    if (deleteInterestsError) {
      throw new AppError(500, 'ONBOARDING_INTERESTS_CLEAR_FAILED', deleteInterestsError.message);
    }
  } else {
    const { data: inserted, error: insertError } = await client
      .from('user_onboarding_responses')
      .insert(payload)
      .select('id, completed_at')
      .single();

    if (insertError || !inserted) {
      throw new AppError(500, 'ONBOARDING_INSERT_FAILED', insertError?.message ?? 'Insert failed');
    }

    responseId = inserted.id as string;
  }

  const interestRows = interestOptionIds.map((optionId) => ({
    response_id: responseId,
    option_id: optionId,
  }));

  const { error: interestsError } = await client.from('user_onboarding_interests').insert(interestRows);

  if (interestsError) {
    throw new AppError(500, 'ONBOARDING_INTERESTS_INSERT_FAILED', interestsError.message);
  }

  await client.rpc('replace_profile_interest_keys', {
    p_user_id: authUser.id,
    p_option_keys: input.interests,
  });

  const locationPayload = {
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    country: input.location.country,
    province: input.location.province,
    suburb: input.location.suburb,
    city: input.location.suburb || null,
    location_updated_at: new Date().toISOString(),
  };

  const { error: locationError } = await client
    .from('profiles')
    .update(locationPayload)
    .eq('user_id', authUser.id);

  if (locationError) {
    const missingLocationSchema =
      /country|province|suburb|latitude|longitude|location_updated_at/i.test(locationError.message) &&
      /schema cache|column/i.test(locationError.message);

    if (missingLocationSchema) {
      console.warn(
        '[onboarding] profiles location columns missing — saving city only. Run sql/006_profile_location.sql in Supabase.',
      );
      const { error: cityFallbackError } = await client
        .from('profiles')
        .update({ city: input.location.suburb || null })
        .eq('user_id', authUser.id);

      if (cityFallbackError) {
        throw new AppError(500, 'PROFILE_LOCATION_UPDATE_FAILED', cityFallbackError.message);
      }
    } else {
      throw new AppError(500, 'PROFILE_LOCATION_UPDATE_FAILED', locationError.message);
    }
  }

  const status = await getUserOnboardingStatus(authUser.id, accessToken);
  return status;
}
