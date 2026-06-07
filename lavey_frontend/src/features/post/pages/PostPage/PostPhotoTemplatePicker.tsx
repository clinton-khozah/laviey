import { useState } from 'react';
import { AppOverlay } from '@/components/ui/AppOverlay';
import {
  DEFAULT_POST_TEMPLATE_ID,
  fileWithTemplate,
  getPostTemplate,
  POST_TEMPLATES,
  templateStickerGradient,
} from './postTemplates';
import './PostPhotoTemplatePicker.css';

interface PostPhotoTemplatePickerProps {
  open: boolean;
  photoFile: File | null;
  photoUrl: string | null;
  onClose: () => void;
  onApply: (file: File) => void;
}

export function PostPhotoTemplatePicker({
  open,
  photoFile,
  photoUrl,
  onClose,
  onApply,
}: PostPhotoTemplatePickerProps) {
  const [activeTemplateId, setActiveTemplateId] = useState(DEFAULT_POST_TEMPLATE_ID);
  const [isApplying, setIsApplying] = useState(false);

  const activeTemplate = getPostTemplate(activeTemplateId);
  const usesFrameOverlay = Boolean(activeTemplate.overlayImage);

  const handleUsePhoto = async () => {
    if (!photoFile) return;
    setIsApplying(true);
    try {
      const file = await fileWithTemplate(photoFile, activeTemplateId);
      onApply(file);
    } finally {
      setIsApplying(false);
    }
  };

  if (!open || !photoFile || !photoUrl) return null;

  return (
    <AppOverlay>
      <div className="post-template-picker" role="dialog" aria-modal="true" aria-label="Choose a template">
        <header className="post-template-picker__header">
          <button type="button" className="post-template-picker__back" onClick={onClose}>
            Back
          </button>
          <span className="post-template-picker__title">Templates</span>
          <button
            type="button"
            className="post-template-picker__done"
            disabled={isApplying}
            onClick={() => void handleUsePhoto()}
          >
            {isApplying ? 'Saving…' : 'Use photo'}
          </button>
        </header>

        <div className="post-template-picker__preview">
          <div
            className={`post-template-picker__photo-frame ${usesFrameOverlay ? 'post-template-picker__photo-frame--overlay' : ''}`}
          >
            <img
              src={photoUrl}
              alt="Your photo with template"
              className={`post-template-picker__image ${usesFrameOverlay ? 'post-template-picker__image--under' : ''}`}
            />
            {usesFrameOverlay && activeTemplate.overlayImage ? (
              <img
                src={activeTemplate.overlayImage}
                alt=""
                className="post-template-picker__overlay"
                draggable={false}
              />
            ) : activeTemplate.text ? (
              <div
                className="post-template-picker__sticker"
                style={{
                  background: templateStickerGradient(activeTemplate),
                  color: activeTemplate.textColor,
                }}
              >
                {activeTemplate.text}
              </div>
            ) : null}
          </div>
        </div>

        <div className="post-template-picker__panel">
          <div className="post-template-picker__list" role="listbox" aria-label="Photo templates">
            {POST_TEMPLATES.map((template) => {
              const isActive = template.id === activeTemplateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  aria-label={template.label}
                  className={`post-template-picker__item ${isActive ? 'post-template-picker__item--active' : ''}`}
                  onClick={() => setActiveTemplateId(template.id)}
                >
                  <span className="post-template-picker__thumb-wrap">
                    <img
                      src={template.previewImage}
                      alt=""
                      className="post-template-picker__thumb"
                      width={56}
                      height={56}
                      draggable={false}
                    />
                  </span>
                  <span className="post-template-picker__label">
                    <span className="post-template-picker__emoji" aria-hidden>
                      {template.emoji}
                    </span>
                    <span className="post-template-picker__name">{template.shortLabel}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="post-template-picker__hint">
            Add a status sticker to your pic — or keep it original.
          </p>
        </div>
      </div>
    </AppOverlay>
  );
}
