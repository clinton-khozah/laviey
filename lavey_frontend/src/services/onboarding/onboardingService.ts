import { usesBackendApi } from '@/config/env';
import { API_ENDPOINTS } from '@/constants/apiEndpoints';
import { httpClient } from '@/services/api/httpClient';
import type { ApiResponse, ProfileInterestItem } from '@/types';
import type {
  OnboardingQuestionDto,
  UserOnboardingStatusDto,
} from '@/types/domain/onboardingCatalog.types';
import type { OnboardingQuizAnswers } from '@/types/domain/onboardingQuiz.types';
import {
  loadOnboardingQuizAnswers,
  saveOnboardingQuizAnswers,
} from '@/utils/onboarding/onboardingQuizStorage';
import { sleep } from '@/utils/sleep';
import { MOCK_ONBOARDING_CATALOG } from './onboarding.mock';

export const onboardingService = {
  async listQuestions(): Promise<OnboardingQuestionDto[]> {
    if (!usesBackendApi()) {
      await sleep(150);
      return MOCK_ONBOARDING_CATALOG;
    }

    const res = await httpClient.get<ApiResponse<OnboardingQuestionDto[]>>(
      API_ENDPOINTS.onboarding.questions,
    );
    return res.data;
  },

  async listInterestOptions(): Promise<ProfileInterestItem[]> {
    const catalog = await this.listQuestions();
    const interests = catalog.find((step) => step.stepKey === 'interests');
    return (interests?.options ?? []).map((opt) => ({
      key: opt.key,
      label: opt.label,
      emoji: opt.emoji,
    }));
  },

  async getOnboardingStatus(): Promise<UserOnboardingStatusDto> {
    if (!usesBackendApi()) {
      await sleep(80);
      const answers = loadOnboardingQuizAnswers();
      return {
        completed: Boolean(answers),
        completedAt: answers?.completedAt ?? null,
      };
    }

    const res = await httpClient.get<ApiResponse<UserOnboardingStatusDto>>(
      API_ENDPOINTS.users.onboarding,
    );
    return res.data;
  },

  async submitOnboarding(answers: OnboardingQuizAnswers): Promise<UserOnboardingStatusDto> {
    if (!usesBackendApi()) {
      await sleep(200);
      saveOnboardingQuizAnswers(answers);
      return { completed: true, completedAt: answers.completedAt };
    }

    const res = await httpClient.post<ApiResponse<UserOnboardingStatusDto>>(
      API_ENDPOINTS.users.onboarding,
      {
        body: {
          purpose: answers.purpose,
          agePreference: answers.agePreference[0],
          interestedIn: answers.interestedIn[0],
          gender: answers.gender,
          orientation: answers.orientation,
          religion: answers.religion,
          interests: answers.interests,
          dateOfBirth: answers.dateOfBirth,
          vibe: answers.vibe,
          location: answers.location,
        },
      },
    );
    saveOnboardingQuizAnswers(answers);
    return res.data;
  },
};
