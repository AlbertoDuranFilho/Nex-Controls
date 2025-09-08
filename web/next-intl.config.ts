import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async ({locale}) => {
  // garante que nunca será undefined
  const currentLocale = locale ?? 'pt';

  return {
    locale: currentLocale,
    messages: (await import(`./messages/${currentLocale}.json`)).default
  };
});