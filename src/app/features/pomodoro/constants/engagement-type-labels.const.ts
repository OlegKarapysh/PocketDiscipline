import { EngagementType } from '../../../core/models/engagement-type.enum';

export const ENGAGEMENT_TYPE_LABELS: Readonly<Record<EngagementType, string>> = {
  [EngagementType.WORK]: 'Work',
  [EngagementType.STUDY]: 'Study',
};
