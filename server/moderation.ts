import { GoogleGenAI, Type } from '@google/genai';

export interface MediaModerationResult {
  allowed: boolean;
  containsNudity: boolean;
  reason: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function inspectMediaForNudity(
  frames: Array<{ mimeType: string; base64Data: string }>
): Promise<MediaModerationResult> {
  if (!frames.length) {
    return {
      allowed: false,
      containsNudity: false,
      reason: 'No inspectable visual frame was provided for safety verification.',
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return {
      allowed: false,
      containsNudity: false,
      reason:
        'Media safety moderation requires GEMINI_API_KEY to be configured in Settings > Secrets before publishing pictures or videos.',
    };
  }

  try {
    const parts = [
      ...frames.map((frame) => ({
        inlineData: {
          mimeType: frame.mimeType,
          data: frame.base64Data,
        },
      })),
      {
        text: [
          'You are the Open Circle safety moderator.',
          'Inspect all attached images or video frames strictly for nudity, partial nudity (exposed breasts, buttocks, or genitals), sexually explicit or suggestive content, or graphic violence.',
          'Normal clothed people, everyday scenes, workshops, food, study notes, gardens, pets, and helpful tutorials are SAFE and should be allowed.',
          'Return JSON indicating whether the media is safe and whether it contains nudity.',
        ].join(' '),
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safe: {
              type: Type.BOOLEAN,
              description: 'True only if the image/frames are completely free of nudity, sexually explicit content, and graphic harm.',
            },
            containsNudity: {
              type: Type.BOOLEAN,
              description: 'True if any nudity, exposed intimate body parts, or sexually explicit imagery appears.',
            },
            reason: {
              type: Type.STRING,
              description: 'Short plain-language explanation of the decision.',
            },
          },
          required: ['safe', 'containsNudity', 'reason'],
        },
      },
    });

    const raw = (response.text ?? '').trim();
    if (!raw) {
      return {
        allowed: false,
        containsNudity: true,
        reason: 'This media triggered safety filtering and cannot be posted on Open Circle.',
      };
    }

    const parsed = JSON.parse(raw) as {
      safe?: boolean;
      containsNudity?: boolean;
      reason?: string;
    };

    const containsNudity = Boolean(parsed.containsNudity);
    const allowed = Boolean(parsed.safe) && !containsNudity;

    return {
      allowed,
      containsNudity,
      reason:
        parsed.reason ||
        (containsNudity
          ? 'Nudity or sexually explicit imagery is strictly prohibited on Open Circle.'
          : 'Approved by Open Circle safety screening.'),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Safety check failed';
    // If Gemini API itself blocked the prompt/response due to explicit safety categories
    if (/safety|blocked|PROHIBITED|HARM/i.test(message)) {
      return {
        allowed: false,
        containsNudity: true,
        reason: 'This media was blocked because it may contain nudity or unsafe content.',
      };
    }
    throw err;
  }
}
