export const isTestDatabaseEnabled = () => {
  return Boolean(
    process.env.VEYLI_INTEGRATION_DATABASE &&
      process.env.NODE_ENV !== 'production' &&
      !process.env.VERCEL
  );
};
