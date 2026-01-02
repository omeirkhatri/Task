/**
 * ESLint rules to prevent direct Date manipulation
 * Add this to your .eslintrc.js or eslint.config.js
 * 
 * Usage in eslint.config.js:
 * import timezoneRules from './.eslintrc.timezone.js';
 * 
 * export default [
 *   ...timezoneRules,
 *   // ... other config
 * ];
 */

module.exports = [
  {
    files: ['**/atomic-crm/**/*.{ts,tsx}'],
    rules: {
      // Warn when using Date methods that don't account for timezone
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'MemberExpression[object.name="Date"][property.name=/^(getHours|getMinutes|getSeconds|getDate|getMonth|getFullYear|getDay)$/]',
          message: 'Use timezone utilities from @/components/atomic-crm/misc/timezone-api instead. Direct Date methods don\'t account for CRM timezone.',
        },
        {
          selector: 'CallExpression[callee.name="Date"][arguments.length>0]',
          message: 'Use createCrmDate() or parseCrmDateString() from timezone-api instead of new Date() constructor with arguments.',
        },
        {
          selector: 'MemberExpression[property.name="toISOString"]',
          message: 'Be careful with toISOString() - it always returns UTC. Use formatCrmDateTime() or crmDateTimeStringToISO() for CRM timezone.',
        },
      ],
    },
  },
];


