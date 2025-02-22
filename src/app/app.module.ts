import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslatorLoaderService, CommerceModule } from '@congarevenuecloud/ecommerce';
import { TableModule, CongaModalModule, IconModule, ProductDrawerModule, ErrorPageModule } from '@congarevenuecloud/elements';
import { ComponentModule } from './components/component.module';
import { AuthConfigModule } from './auth/auth-config.module';
import { AppRoutingModule } from './app-routing.module';
import { ConfigureGuard } from './services/configure.guard';
import { AuthorizationGuard } from './auth/auth.guard';
import { MainComponent } from './main.component';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';

// Locale data
import { registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import localeFr from '@angular/common/locales/fr';
import localeEs from '@angular/common/locales/es';
import localeItExtras from '@angular/common/locales/extra/it';
import localeFrExtras from '@angular/common/locales/extra/fr';
import localeEsExtras from '@angular/common/locales/extra/es';

registerLocaleData(localeIt, 'it-IT', localeItExtras);
registerLocaleData(localeFr, 'fr-FR', localeFrExtras);
registerLocaleData(localeEs, 'es-MX', localeEsExtras);
@NgModule({
  declarations: [
    AppComponent,
    MainComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    CommerceModule.forRoot(environment),
    TranslateModule.forRoot({
      loader: { provide: TranslateLoader, useClass: TranslatorLoaderService }
    }),
    TableModule,
    ComponentModule,
    ProductDrawerModule,
    CongaModalModule,
    IconModule,
    AuthConfigModule,
    ErrorPageModule
  ],
  providers: [
    AuthorizationGuard,
    ConfigureGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
