import { useCallback, useEffect, useMemo, useState } from 'react';

import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';

import { AppLoader } from '@/components/ui/AppLoader';

import { APP_IMAGES } from '@/constants/images';

import { useLiveUserLocation } from '@/hooks/geolocation/useLiveUserLocation';

import { onboardingService } from '@/services/onboarding/onboardingService';

import type { OnboardingQuestionDto } from '@/types/domain/onboardingCatalog.types';

import type { QuizOptionView } from '@/types/domain/onboardingCatalog.types';

import type { OnboardingQuizAnswers } from '@/types/domain/onboardingQuiz.types';

import {

  answerFieldForStepKey,

  isDenseGridStep,

  toQuizOptionViews,

} from '@/utils/onboarding/onboardingStepKeys';

import { OnboardingLocationStep } from './OnboardingLocationStep';

import './OnboardingQuizPage.css';


interface OnboardingQuizPageProps {

  onContinue: (answers: OnboardingQuizAnswers) => void | Promise<void>;

}



type QuizAnswersState = {

  purpose: OnboardingQuizAnswers['purpose'] | null;

  dateOfBirth: OnboardingQuizAnswers['dateOfBirth'] | null;

  agePreference: OnboardingQuizAnswers['agePreference'];

  interestedIn: OnboardingQuizAnswers['interestedIn'];

  gender: OnboardingQuizAnswers['gender'] | null;

  orientation: OnboardingQuizAnswers['orientation'] | null;

  religion: OnboardingQuizAnswers['religion'] | null;

  interests: OnboardingQuizAnswers['interests'];

};



const slideVariants = {

  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),

  center: { opacity: 1, x: 0 },

  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),

};



const INITIAL_ANSWERS: QuizAnswersState = {

  purpose: null,

  dateOfBirth: null,

  agePreference: [],

  interestedIn: [],

  gender: null,

  orientation: null,

  religion: null,

  interests: [],

};



function toISODate(d: Date): string {

  const yyyy = d.getFullYear();

  const mm = String(d.getMonth() + 1).padStart(2, '0');

  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;

}



function calcAgeFromISODate(iso: string): number | null {

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

  if (!m) return null;

  const y = Number(m[1]);

  const mo = Number(m[2]);

  const da = Number(m[3]);

  if (!y || mo < 1 || mo > 12 || da < 1 || da > 31) return null;

  const dob = new Date(y, mo - 1, da);

  if (Number.isNaN(dob.getTime())) return null;



  const today = new Date();

  let age = today.getFullYear() - dob.getFullYear();

  const hasHadBirthday =

    today.getMonth() > dob.getMonth() ||

    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  if (!hasHadBirthday) age -= 1;

  return age;

}



export function OnboardingQuizPage({ onContinue }: OnboardingQuizPageProps) {

  const [catalog, setCatalog] = useState<OnboardingQuestionDto[]>([]);

  const [catalogLoading, setCatalogLoading] = useState(true);

  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);

  const [direction, setDirection] = useState(1);

  const [answers, setAnswers] = useState<QuizAnswersState>(INITIAL_ANSWERS);

  const [pendingSubmit, setPendingSubmit] = useState<OnboardingQuizAnswers | null>(null);

  const [showMinSelectionError, setShowMinSelectionError] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const continueShake = useAnimationControls();

  const hintShake = useAnimationControls();

  const {
    location: liveLocation,
    status: locationStatus,
    error: locationError,
    isResolvingPlace,
    requestLocation,
    stopWatching,
  } = useLiveUserLocation();



  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);

    setCatalogError(null);

    try {

      const questions = await onboardingService.listQuestions();

      if (questions.length === 0) {

        setCatalogError('No quiz questions are available right now.');

        setCatalog([]);

      } else {

        setCatalog(questions);

      }

    } catch (err) {

      setCatalogError(err instanceof Error ? err.message : 'Could not load quiz.');

      setCatalog([]);

    } finally {

      setCatalogLoading(false);

    }

  }, []);



  useEffect(() => {

    void loadCatalog();

  }, [loadCatalog]);



  const step = catalog[stepIndex];

  const onLocationStep = catalog.length > 0 && stepIndex === catalog.length;

  const totalSteps = catalog.length + 1;

  const isLastCatalogStep = catalog.length > 0 && stepIndex === catalog.length - 1;

  const progressPct = totalSteps > 0 ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0;

  const hasLocationReady =
    locationStatus === 'watching' &&
    Boolean(liveLocation?.city && liveLocation?.province && liveLocation?.country) &&
    !isResolvingPlace;



  const getSingleValue = useCallback(
    (stepKey: string): string | null => {

      const field = answerFieldForStepKey(stepKey);

      if (!field) return null;



      const val = answers[field];

      if (field === 'agePreference' || field === 'interestedIn') {

        return (val as string[])[0] ?? null;

      }

      return typeof val === 'string' ? val : null;

    },

    [answers],

  );



  const getMultiValue = useCallback(

    (stepKey: string): string[] => {

      const field = answerFieldForStepKey(stepKey);

      if (!field) return [];



      const val = answers[field];

      return Array.isArray(val) ? val : [];

    },

    [answers],

  );



  const advance = useCallback(() => {

    if (stepIndex >= catalog.length - 1) return;

    setDirection(1);

    setStepIndex((i) => i + 1);

  }, [stepIndex, catalog.length]);



  const handleSingleSelect = (value: string) => {

    if (!step) return;

    const field = answerFieldForStepKey(step.stepKey);

    if (!field) return;



    if (field === 'agePreference' || field === 'interestedIn') {

      setAnswers((prev) => ({

        ...prev,

        [field]: [value],

      }));

    } else {

      setAnswers((prev) => ({ ...prev, [field]: value }));

    }



    if (!isLastCatalogStep) {

      window.setTimeout(advance, 280);

    }

  };



  const goToLocationStep = () => {
    setDirection(1);
    setStepIndex(catalog.length);
  };



  const handleMultiToggle = (value: string) => {
    if (!step || step.stepKey !== 'interests') return;

    setAnswers((prev) => {

      const has = prev.interests.some((v) => v === value);

      const next = has

        ? prev.interests.filter((v) => v !== value)

        : [...prev.interests, value as (typeof prev.interests)[number]];

      return { ...prev, interests: next };

    });

  };



  const goBack = () => {

    if (onLocationStep) {

      stopWatching();

      setDirection(-1);

      setStepIndex(catalog.length - 1);

      return;

    }

    if (stepIndex === 0) return;

    setDirection(-1);

    setStepIndex((i) => i - 1);

  };


  const multiSelection = step ? getMultiValue(step.stepKey) : [];

  const minRequired = step?.minSelections ?? 1;

  const canAdvanceMulti = multiSelection.length >= minRequired;



  useEffect(() => {

    if (canAdvanceMulti) setShowMinSelectionError(false);

  }, [canAdvanceMulti, stepIndex]);



  const playDenyShake = useCallback(async () => {

    const shake = { x: [0, -10, 10, -8, 8, -4, 4, 0] };

    const transition = { duration: 0.42, ease: 'easeInOut' as const };

    await Promise.all([

      continueShake.start({ ...shake, transition }),

      hintShake.start({ ...shake, transition }),

    ]);

    continueShake.set({ x: 0 });

    hintShake.set({ x: 0 });

  }, [continueShake, hintShake]);



  const handleStepContinue = () => {

    if (isLastCatalogStep) {

      if (canAdvanceMulti) {

        setShowMinSelectionError(false);

        goToLocationStep();

      } else {

        setShowMinSelectionError(true);

        void playDenyShake();

      }

      return;

    }



    if (canAdvanceMulti) {

      setShowMinSelectionError(false);

      advance();

      return;

    }



    setShowMinSelectionError(true);

    void playDenyShake();

  };


  const dobMin = useMemo(() => toISODate(new Date(1900, 0, 1)), []);

  const dobMax = useMemo(() => toISODate(new Date()), []);

  const dobValue = answers.dateOfBirth ?? '';

  const dobAge = answers.dateOfBirth ? calcAgeFromISODate(answers.dateOfBirth) : null;

  const dobValid = step?.stepKey !== 'date_of_birth' ? true : Boolean(dobAge !== null && dobAge >= 18);



  const handleDobContinue = () => {
    if (dobValid) {
      setShowMinSelectionError(false);
      if (isLastCatalogStep) {
        goToLocationStep();
      } else {
        advance();
      }
    } else {
      void playDenyShake();
    }
  };



  const canFinish = useMemo(() => {

    return (

      answers.purpose !== null &&

      answers.dateOfBirth !== null &&

      answers.agePreference.length > 0 &&

      answers.interestedIn.length > 0 &&

      answers.gender !== null &&

      answers.orientation !== null &&

      answers.religion !== null &&

      answers.interests.length >= 3

    );

  }, [answers]);



  const canStartExploring =
    canFinish && hasLocationReady && Boolean(liveLocation) && !isSubmitting;



  const submitAnswers = useCallback(
    async (payload: OnboardingQuizAnswers) => {
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        await onContinue(payload);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
        setIsSubmitting(false);
      }
    },
    [onContinue],
  );

  const handleFinish = () => {

    if (!canStartExploring || !liveLocation) return;



    const payload: OnboardingQuizAnswers = {

      purpose: answers.purpose!,

      vibe: 'chill',

      dateOfBirth: answers.dateOfBirth!,

      agePreference: answers.agePreference,

      interestedIn: answers.interestedIn,

      gender: answers.gender!,

      orientation: answers.orientation!,

      religion: answers.religion!,

      interests: answers.interests,

      location: liveLocation,

      completedAt: new Date().toISOString(),

    };



    stopWatching();

    setPendingSubmit(payload);

    void submitAnswers(payload);

  };



  useEffect(() => () => stopWatching(), [stopWatching]);



  if (catalogLoading) {
    return <AppLoader />;

  }



  if (catalogError || (!step && !onLocationStep)) {
    return (

      <div className="onboarding-quiz onboarding-quiz--error">

        <div className="onboarding-quiz__shell">

          <p className="onboarding-quiz__intro">{catalogError ?? 'Quiz unavailable.'}</p>

          <button type="button" className="onboarding-quiz__continue" onClick={() => void loadCatalog()}>

            Try again

          </button>

        </div>

      </div>

    );

  }



  const options: QuizOptionView[] = step ? toQuizOptionViews(step.options) : [];

  const isMulti = step?.kind === 'multi';

  const isInput = step?.kind === 'input';

  const isDenseGrid = step ? isDenseGridStep(step.stepKey) : false;



  const renderOption = (opt: QuizOptionView) => {

    if (!step) return null;

    const selected = isMulti

      ? multiSelection.includes(opt.value)

      : getSingleValue(step.stepKey) === opt.value;



    return (

      <li key={opt.value} role="none" className={isDenseGrid ? 'onboarding-quiz__option-wrap--grid' : undefined}>

        <button

          type="button"

          role="option"

          aria-selected={selected}

          className={`onboarding-quiz__option ${selected ? 'onboarding-quiz__option--active' : ''} ${isDenseGrid ? 'onboarding-quiz__option--compact' : ''}`}

          onClick={() => (isMulti ? handleMultiToggle(opt.value) : handleSingleSelect(opt.value))}

        >

          <span className="onboarding-quiz__option-emoji" aria-hidden>

            {opt.emoji}

          </span>

          <span className="onboarding-quiz__option-text">

            <span className="onboarding-quiz__option-label">{opt.label}</span>

            {!isDenseGrid && <span className="onboarding-quiz__option-hint">{opt.hint}</span>}

          </span>

          <span

            className={`onboarding-quiz__option-check ${selected ? 'onboarding-quiz__option-check--visible' : ''}`}

            aria-hidden

          >

            ✓

          </span>

        </button>

      </li>

    );

  };



  return (

    <div className="onboarding-quiz">

      <div className="onboarding-quiz__bg" aria-hidden>

        <img src={APP_IMAGES.logo} alt="" className="onboarding-quiz__bg-img" />

        <div className="onboarding-quiz__bg-scrim" />

        <div className="onboarding-quiz__blob onboarding-quiz__blob--a" />

        <div className="onboarding-quiz__blob onboarding-quiz__blob--b" />

      </div>



      <div className="onboarding-quiz__shell">

        <header className="onboarding-quiz__top">

          {stepIndex > 0 || onLocationStep ? (
            <button type="button" className="onboarding-quiz__back" onClick={goBack} aria-label="Back">

              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>

                <path d="M15 18l-6-6 6-6" />

              </svg>

            </button>

          ) : (

            <span className="onboarding-quiz__back-spacer" aria-hidden />

          )}

          <img src={APP_IMAGES.logoWithText} alt="Lavey" className="onboarding-quiz__brand" />

          <span className="onboarding-quiz__back-spacer" aria-hidden />

        </header>



        <p className="onboarding-quiz__intro">

          Complete this quiz to help us find you a best partner.

        </p>



        <div

          className="onboarding-quiz__progress-track"

          role="progressbar"

          aria-valuenow={progressPct}

          aria-valuemin={0}

          aria-valuemax={100}

        >

          <span className="onboarding-quiz__progress-fill" style={{ width: `${progressPct}%` }} />

        </div>

        <p className="onboarding-quiz__step-label">

          Step {stepIndex + 1} of {totalSteps}

          {!onLocationStep && isMulti && step?.minSelections

            ? ` · pick ${step.minSelections}${step.stepKey === 'interests' ? '+' : ''}`

            : ''}

        </p>



        <div className="onboarding-quiz__stage">

          <AnimatePresence mode="wait" custom={direction}>

            {onLocationStep ? (

              <motion.section

                key="location"

                className="onboarding-quiz__card"

                custom={direction}

                variants={slideVariants}

                initial="enter"

                animate="center"

                exit="exit"

                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}

              >

                <OnboardingLocationStep

                  location={liveLocation}

                  status={locationStatus}

                  error={locationError}

                  isResolvingPlace={isResolvingPlace}

                  onRequestLocation={requestLocation}

                />

              </motion.section>

            ) : step ? (

            <motion.section

              key={step.stepKey}
              className="onboarding-quiz__card"

              custom={direction}

              variants={slideVariants}

              initial="enter"

              animate="center"

              exit="exit"

              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}

            >

              <div className="onboarding-quiz__visual" aria-hidden>

                <span className="onboarding-quiz__visual-ring" />

                <span className="onboarding-quiz__visual-emoji">{step.heroEmoji}</span>

              </div>



              <h1 className="onboarding-quiz__title">{step.title}</h1>

              <p className="onboarding-quiz__subtitle">{step.subtitle}</p>



              {isInput && step.stepKey === 'date_of_birth' ? (

                <div className="onboarding-quiz__input-wrap">

                  <label className="onboarding-quiz__input-label" htmlFor="onboarding-dob">

                    Date of birth

                  </label>

                  <input

                    id="onboarding-dob"

                    className="onboarding-quiz__input"

                    type="date"

                    inputMode="numeric"

                    min={dobMin}

                    max={dobMax}

                    value={dobValue}

                    onChange={(e) => setAnswers((prev) => ({ ...prev, dateOfBirth: e.target.value || null }))}

                  />

                  <p className={`onboarding-quiz__input-hint ${dobValid ? '' : 'onboarding-quiz__input-hint--error'}`}>

                    {dobValue.length === 0

                      ? 'You can type it or use the picker.'

                      : dobAge === null

                        ? 'Please enter a valid date.'

                        : dobAge < 18

                          ? 'You must be 18+ to use Lavey.'

                          : `Age: ${dobAge}`}

                  </p>

                </div>

              ) : (

                <ul

                  className={`onboarding-quiz__options ${isDenseGrid ? 'onboarding-quiz__options--grid' : ''} ${options.length > 5 ? 'onboarding-quiz__options--scroll' : ''}`}

                  role="listbox"

                  aria-label={step.title}

                  aria-multiselectable={isMulti || undefined}

                >

                  {options.map(renderOption)}

                </ul>

              )}



              {isMulti && (

                <motion.p

                  id="onboarding-interests-hint"

                  className={`onboarding-quiz__multi-hint ${showMinSelectionError && !canAdvanceMulti ? 'onboarding-quiz__multi-hint--error' : ''}`}

                  animate={hintShake}

                  role="status"

                >

                  {multiSelection.length} selected · {minRequired} minimum

                  {showMinSelectionError && !canAdvanceMulti

                    ? ` — pick ${Math.max(minRequired - multiSelection.length, 1)} more`

                    : ''}

                </motion.p>

              )}

            </motion.section>

            ) : null}

          </AnimatePresence>

        </div>



        {(isMulti || isInput) && !onLocationStep && !isLastCatalogStep && (
          <motion.div animate={continueShake} className="onboarding-quiz__continue-wrap">

            <motion.button

              type="button"

              className={`onboarding-quiz__continue ${(isMulti && !canAdvanceMulti) || (isInput && !dobValid) ? 'onboarding-quiz__continue--inactive' : ''}`}

              onClick={isInput ? handleDobContinue : handleStepContinue}

              initial={{ opacity: 0, y: 8 }}

              animate={{ opacity: 1, y: 0 }}

              aria-describedby={isMulti ? 'onboarding-interests-hint' : undefined}

            >

              Continue

            </motion.button>

          </motion.div>

        )}



        {isLastCatalogStep && (isMulti || isInput) && !onLocationStep && (
          <motion.div animate={continueShake} className="onboarding-quiz__continue-wrap">

            <motion.button

              type="button"

              className={`onboarding-quiz__continue ${(isMulti && !canAdvanceMulti) || (isInput && !dobValid) ? 'onboarding-quiz__continue--inactive' : ''}`}

              onClick={isInput ? handleDobContinue : handleStepContinue}

              initial={{ opacity: 0, y: 8 }}

              animate={{ opacity: 1, y: 0 }}

              aria-describedby={isMulti ? 'onboarding-interests-hint' : undefined}

            >

              Continue

            </motion.button>

          </motion.div>

        )}



        {onLocationStep && (
          <motion.button

            type="button"

            className={`onboarding-quiz__continue ${!canStartExploring ? 'onboarding-quiz__continue--inactive' : ''}`}

            disabled={!canStartExploring}
            onClick={handleFinish}

            initial={{ opacity: 0, y: 12 }}

            animate={{ opacity: 1, y: 0 }}

            transition={{ delay: 0.1 }}

          >

            Start exploring

          </motion.button>

        )}

      </div>



      <AnimatePresence>

        {pendingSubmit && (

          <motion.div

            className="onboarding-quiz__welcome-overlay"

            initial={{ opacity: 0 }}

            animate={{ opacity: 1 }}

            exit={{ opacity: 0 }}

          >

            <motion.section

              className="onboarding-quiz__welcome-card"

              initial={{ opacity: 0, y: 18, scale: 0.98 }}

              animate={{ opacity: 1, y: 0, scale: 1 }}

              exit={{ opacity: 0, y: 8, scale: 0.98 }}

              transition={{ duration: 0.2 }}

            >

              {submitError ? (
                <>
                  <p className="onboarding-quiz__welcome-kicker">We hit a snag</p>
                  <h2 className="onboarding-quiz__welcome-title">Couldn&apos;t finish matching</h2>
                  <p className="onboarding-quiz__multi-hint onboarding-quiz__multi-hint--error" role="alert">
                    {submitError}
                  </p>
                  <button
                    type="button"
                    className="onboarding-quiz__continue"
                    onClick={() => void submitAnswers(pendingSubmit)}
                  >
                    Try again
                  </button>
                </>
              ) : (
                <>
                  <p className="onboarding-quiz__welcome-kicker">Almost there</p>
                  <h2 className="onboarding-quiz__welcome-title onboarding-quiz__welcome-title--pulse">
                    Wait — we&apos;re finding your best match!
                  </h2>
                  <p className="onboarding-quiz__welcome-copy">
                    Your vibe is in. Hang tight while we line up someone who actually gets you.
                  </p>
                  <div className="onboarding-quiz__matching-dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </div>
                </>
              )}

            </motion.section>

          </motion.div>

        )}

      </AnimatePresence>

    </div>

  );

}


