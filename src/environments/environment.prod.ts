import { Configuration } from '@congarevenuecloud/core';

export const environment: Configuration = {
  production: true,
  defaultImageSrc: './assets/images/default.png',
  defaultCountry: 'US',
  defaultLanguage: 'en-US',
  defaultCurrency: 'USD',
  productIdentifier: 'Id',
  translationModule: 'Digital Commerce',
  hashRouting: true,
  // *** TODO: Replace with details of your Conga platform instance ***
  endpoint: 'Endpoint name',
  storefrontId: 'Storefront Id',
  clientId: 'Client Id',
  authority: 'Auth Url'
};