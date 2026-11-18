// Fixed lists for now; Phase 10 makes them editable by Super Admin.
export const RELATIONS = [
  ['head', 'Family head', 'परिवार प्रमुख'], ['spouse', 'Spouse', 'पति/पत्नी'], ['son', 'Son', 'बेटा'], ['daughter', 'Daughter', 'बेटी'],
  ['daughter-in-law', 'Daughter-in-law', 'बहू'], ['grandson', 'Grandson', 'पोता'], ['granddaughter', 'Granddaughter', 'पोती'],
  ['father', 'Father', 'पिता'], ['mother', 'Mother', 'माता'], ['brother', 'Brother', 'भाई'], ['sister', 'Sister', 'बहन'], ['son-in-law', 'Son-in-law', 'दामाद'], ['other', 'Other', 'अन्य']];
export const REL_LABELS = Object.fromEntries([...RELATIONS.map(r => [r[0], r[1]]), ['former-head', 'Former head'], ['great-grandson', 'Great-grandson'], ['great-granddaughter', 'Great-granddaughter']]);
export const GENDERS = [['male', 'Male', 'पुरुष'], ['female', 'Female', 'महिला'], ['other', 'Other', 'अन्य']];
export const FAMILY_TYPES = [['Joint', 'Joint', 'संयुक्त'], ['Nuclear', 'Nuclear', 'एकल'], ['Other', 'Other', 'अन्य']];
export const MARITAL = [['Unmarried', 'Unmarried', 'अविवाहित'], ['Married', 'Married', 'विवाहित'], ['Widowed', 'Widowed', 'विधवा/विधुर']];
export const EDUCATION = ['Illiterate', 'Primary (1-5)', 'Middle (6-8)', '10th', '12th', 'Diploma / ITI', 'Graduate', 'Post-graduate', 'Professional (Engg/Medical/CA etc.)', 'Other'];
export const OCCUPATIONS = ['Student', 'Business', 'Service', 'Farmer', 'Labour', 'Housewife', 'Retired', 'Professional', 'Unemployed', 'Other'];
export const DEFAULTS = { gotra: ['Taak', 'Bhati (Bhatee)', 'Chauhan', 'Deora (Doera)', 'Rao', 'Panwar', 'Molani', 'Kukda', 'Sonawa', 'Mandawara', 'Gohil (Gahlot)', 'Bhavsar', 'Dilwari', 'Rangara'],
  education: EDUCATION.slice(0, -1), occupation: OCCUPATIONS.slice(0, -1), family_type: ['Joint', 'Nuclear'], house_type: ['Own House', 'Rented', 'Joint / Ancestral'],
  blood_group: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  transfer_reason: ['Change of residence / location', 'Marriage', 'Job / business', 'Education', 'Family separation', 'Correction of wrong location'],
  notice_category: ['General Notice', 'Meeting Notice', 'Fund Appeal', 'Eid Mubarak', 'Condolence', 'Programme Invitation'] };
