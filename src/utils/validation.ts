// Validation utilities for data validation and input sanitization

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Normal assessment scores validation
export const validateAssessmentScores = (scores: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!scores || typeof scores !== 'object') {
    errors.push('Assessment scores must be an object');
    return { isValid: false, errors };
  }

  // Required fields for normal assessment
  const requiredFields = [
    'stress', 'sleep', 'focus', 'anxiety', 'energy', 'breathing',
    'heart_condition', 'asthma_bronchitis', 'pregnancy', 
    'high_blood_pressure', 'diabetes', 'age_group', 'physical_limitations',
    'physical_activity', 'meditation_experience', 'work_life_balance',
    'health_goals'
  ];

  for (const field of requiredFields) {
    if (scores[field] === undefined || scores[field] === null) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof scores[field] !== 'number') {
      errors.push(`Field ${field} must be a number`);
    } else {
      // Özel alanlar için farklı aralıklar
      if (field === 'age_group') {
        if (scores[field] < 0 || scores[field] > 3) {
          errors.push(`Field ${field} must be between 0 and 3`);
        }
      } else if (['heart_condition', 'asthma_bronchitis', 'pregnancy', 'high_blood_pressure', 'diabetes', 'physical_limitations'].includes(field)) {
        // Hastalık sorularında 0 (Hayır) ve 1 (Evet) geçerli
        if (scores[field] !== 0 && scores[field] !== 1) {
          errors.push(`Field ${field} must be 0 or 1`);
        }
      } else {
        // Diğer sorularda 0 geçersiz (kullanıcı seçim yapmalı)
        if (scores[field] <= 0 || scores[field] > 5) {
          errors.push(`Field ${field} must be between 1 and 5`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Premium assessment scores validation
export const validatePremiumAssessmentScores = (scores: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!scores || typeof scores !== 'object') {
    errors.push('Assessment scores must be an object');
    return { isValid: false, errors };
  }

  // Required fields for premium assessment (includes additional fields)
  const requiredFields = [
    'stress', 'sleep', 'focus', 'anxiety', 'energy',
    'heart_condition', 'asthma_bronchitis', 'pregnancy', 
    'high_blood_pressure', 'diabetes', 'age_group', 'physical_limitations',
    'physical_activity', 'meditation_experience', 'work_life_balance',
    'health_goals', 'favorite_technique', 
    'preferred_duration', 'best_time', 'stress_triggers', 'sleep_issues',
    'focus_challenges', 'energy_patterns', 'lifestyle_factors', 'wellness_goals'
  ];

  for (const field of requiredFields) {
    if (scores[field] === undefined || scores[field] === null) {
      errors.push(`Missing required field: ${field}`);
    } else if (typeof scores[field] !== 'number') {
      errors.push(`Field ${field} must be a number`);
    } else {
      // Premium için özel alan kontrolleri
      if (field === 'age_group') {
        if (scores[field] < 1 || scores[field] > 3) {
          errors.push(`Field ${field} must be between 1 and 3`);
        }
      } else if (['heart_condition', 'asthma_bronchitis', 'pregnancy', 'high_blood_pressure', 'diabetes', 'physical_limitations'].includes(field)) {
        if (scores[field] < 0 || scores[field] > 1) {
          errors.push(`Field ${field} must be 0 or 1`);
        }
      } else {
        if (scores[field] < 0 || scores[field] > 5) {
          errors.push(`Field ${field} must be between 0 and 5`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Premium program validation
export const validatePremiumProgram = (program: any): ValidationResult => {
  const errors: string[] = [];
  
  if (!program || typeof program !== 'object') {
    errors.push('Program must be an object');
    return { isValid: false, errors };
  }

  // Check required program fields
  if (!program.program || !Array.isArray(program.program)) {
    errors.push('Program must have a program array');
  } else {
    // Validate each day in the program
    program.program.forEach((day: any, index: number) => {
      if (!day || typeof day !== 'object') {
        errors.push(`Day ${index + 1} must be an object`);
        return;
      }

      if (!day.day || typeof day.day !== 'number') {
        errors.push(`Day ${index + 1} must have a valid day number`);
      }

      if (!day.techniques || !Array.isArray(day.techniques)) {
        errors.push(`Day ${index + 1} must have a techniques array`);
      }

      if (!day.title || typeof day.title !== 'string') {
        errors.push(`Day ${index + 1} must have a valid title`);
      }

      if (!day.description || typeof day.description !== 'string') {
        errors.push(`Day ${index + 1} must have a valid description`);
      }

      if (!day.duration || typeof day.duration !== 'string') {
        errors.push(`Day ${index + 1} must have a valid duration`);
      }

      if (!day.intensity || !['low', 'medium', 'high'].includes(day.intensity)) {
        errors.push(`Day ${index + 1} must have a valid intensity (low/medium/high)`);
      }

      if (!day.session || !['morning', 'evening'].includes(day.session)) {
        errors.push(`Day ${index + 1} must have a valid session (morning/evening)`);
      }
    });
  }

  if (!program.completedDays || !Array.isArray(program.completedDays)) {
    errors.push('Program must have a completedDays array');
  }

  if (!program.currentDay || typeof program.currentDay !== 'number') {
    errors.push('Program must have a valid currentDay number');
  }

  if (program.isPremium !== true) {
    errors.push('Program must be marked as premium');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// User input sanitization
export const sanitizeString = (input: any): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

export const sanitizeNumber = (input: any): number => {
  const num = Number(input);
  return isNaN(num) ? 0 : Math.max(0, Math.min(5, num)); // Clamp between 0-5
};

export const sanitizeEmail = (email: any): string => {
  if (typeof email !== 'string') {
    return '';
  }
  
  // Basic email validation and sanitization
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
};

// Technique validation
export const validateTechnique = (technique: any): boolean => {
  if (typeof technique !== 'string') {
    return false;
  }
  
  const validTechniques = [
    'diaphragmatic', '4-7-8', 'box-breathing', 'kapalabhati', 'nadi-shodhana',
    'alternate_nostril', 'alternate_nostril_advanced', 'coherent_breathing', 'bhramari', 'bhramari_advanced',
    'anxiety-relief', 'ujjayi', 'sitali', 'sitkari', 'lion_breath',
    'victorious_breath', 'three_part_breath', 'equal_breathing',
    'pursed_lip_breathing', 'deep_breathing', 'mindful_breathing'
  ];
  
  return validTechniques.includes(technique);
};

// Session validation
export const validateSession = (session: any): boolean => {
  if (typeof session !== 'string') {
    return false;
  }
  
  return ['morning', 'evening'].includes(session);
};

// Intensity validation
export const validateIntensity = (intensity: any): boolean => {
  if (typeof intensity !== 'string') {
    return false;
  }
  
  return ['low', 'medium', 'high'].includes(intensity);
};

// User ID validation
export const validateUserId = (userId: any): boolean => {
  if (typeof userId !== 'string') {
    return false;
  }
  
  // Firebase UID format validation (basic)
  return /^[a-zA-Z0-9]{28}$/.test(userId);
};

// Program day validation
export const validateProgramDay = (day: any): boolean => {
  if (typeof day !== 'number') {
    return false;
  }
  
  return day >= 1 && day <= 21; // Premium program is 21 days
}; 