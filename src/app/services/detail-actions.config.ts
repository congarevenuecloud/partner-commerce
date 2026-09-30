import { DetailAction, DetailActionArea, DetailActionSection, DetailActionUserType } from '@congarevenuecloud/ecommerce';

// Partner commerce users always authenticate, so every action targets logged-in users.
const LOGGED_IN_ONLY = [DetailActionUserType.LoggedIn];

// Built-in action configuration for the partner commerce detail page sections, used when the
// storefront displayActions API returns no override. ActionArea places each action in the header
// (Main) or the kebab menu; Sequence orders actions within an area. Authoring actions lead the
// header while the quote is being built and move into the kebab once it is Presented, matching the
// built-in page layout. Order actions are all header buttons (the order page has no kebab).
export const DEFAULT_DETAIL_ACTIONS: Array<DetailAction> = [
  // ---------------------------------------------------------------------------------------------
  // Quote detail - buyer actions once the quote is presented
  // ---------------------------------------------------------------------------------------------
  {
    Name: 'Reject',
    Section: DetailActionSection.Quote,
    Sequence: 1,
    IsEnabled: true,
    ActionName: 'Reject',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: false,
    ActionLabelName: 'COMMON.REJECT',
    IsPrimaryAction: false,
    Stage: ['Presented'],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'AcceptQuote',
    Section: DetailActionSection.Quote,
    Sequence: 2,
    IsEnabled: true,
    ActionName: 'AcceptQuote',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: false,
    ActionLabelName: 'COMMON.ACCEPT_QUOTE',
    IsPrimaryAction: true,
    Stage: ['Presented'],
    UserType: LOGGED_IN_ONLY
  },

  // ---------------------------------------------------------------------------------------------
  // Quote detail - seller authoring actions, header while drafting / generated
  // ---------------------------------------------------------------------------------------------
  {
    Name: 'Generate',
    Section: DetailActionSection.Quote,
    Sequence: 3,
    IsEnabled: true,
    ActionName: 'Generate',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: false,
    ActionLabelName: 'DETAILS.GENERATE_QUOTE',
    IsPrimaryAction: false,
    Stage: ['Draft'],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'SendForSignature',
    Section: DetailActionSection.Quote,
    Sequence: 4,
    IsEnabled: true,
    ActionName: 'SendForSignature',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: false,
    ActionLabelName: 'SEND_FOR_SIGNATURE.BUTTON_TEXT',
    IsPrimaryAction: false,
    Stage: ['Generated'],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'Present',
    Section: DetailActionSection.Quote,
    Sequence: 5,
    IsEnabled: true,
    ActionName: 'Present',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: false,
    ActionLabelName: 'DETAILS.PRESENT_QUOTE',
    IsPrimaryAction: true,
    Stage: ['Generated'],
    UserType: LOGGED_IN_ONLY
  },

  // ---------------------------------------------------------------------------------------------
  // Quote detail - kebab: Generate drops to the menu once generated; the rest once presented
  // ---------------------------------------------------------------------------------------------
  {
    Name: 'RequestChanges',
    Section: DetailActionSection.Quote,
    Sequence: 3,
    IsEnabled: true,
    ActionName: 'RequestChanges',
    ActionArea: DetailActionArea.Kebab,
    AlwaysDisplay: false,
    ActionLabelName: 'COMMENTS.REQUEST_CHANGES',
    IsPrimaryAction: false,
    Stage: ['Presented'],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'GenerateKebab',
    Section: DetailActionSection.Quote,
    Sequence: 4,
    IsEnabled: true,
    ActionName: 'Generate',
    ActionArea: DetailActionArea.Kebab,
    AlwaysDisplay: false,
    ActionLabelName: 'DETAILS.GENERATE_QUOTE',
    IsPrimaryAction: false,
    Stage: ['Generated', 'Presented'],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'SendForSignaturePresented',
    Section: DetailActionSection.Quote,
    Sequence: 5,
    IsEnabled: true,
    ActionName: 'SendForSignature',
    ActionArea: DetailActionArea.Kebab,
    AlwaysDisplay: false,
    ActionLabelName: 'SEND_FOR_SIGNATURE.BUTTON_TEXT',
    IsPrimaryAction: false,
    Stage: ['Presented'],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'PresentPresented',
    Section: DetailActionSection.Quote,
    Sequence: 6,
    IsEnabled: true,
    ActionName: 'Present',
    ActionArea: DetailActionArea.Kebab,
    AlwaysDisplay: false,
    ActionLabelName: 'DETAILS.PRESENT_QUOTE',
    IsPrimaryAction: false,
    Stage: ['Presented'],
    UserType: LOGGED_IN_ONLY
  },

  // ---------------------------------------------------------------------------------------------
  // Order detail - all header buttons (the order page renders no kebab menu)
  // ---------------------------------------------------------------------------------------------
  {
    Name: 'ConfirmOrder',
    Section: DetailActionSection.Order,
    Sequence: 3,
    IsEnabled: true,
    ActionName: 'ConfirmOrder',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: false,
    ActionLabelName: 'MY_ACCOUNT.ORDER_DETAIL.CONFIRM_ORDER',
    IsPrimaryAction: true,
    Stage: ['Draft', 'Generated', 'Presented'],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'PresentOrder',
    Section: DetailActionSection.Order,
    Sequence: 1,
    IsEnabled: true,
    ActionName: 'PresentOrder',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: false,
    ActionLabelName: 'DETAILS.PRESENT_ORDER',
    IsPrimaryAction: false,
    Stage: ['Generated', 'Presented'],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'GenerateOrder',
    Section: DetailActionSection.Order,
    Sequence: 2,
    IsEnabled: true,
    ActionName: 'GenerateOrder',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: false,
    ActionLabelName: 'DETAILS.GENERATE_ORDER',
    IsPrimaryAction: false,
    Stage: ['Draft', 'Generated', 'Presented'],
    UserType: LOGGED_IN_ONLY
  },

  // ---------------------------------------------------------------------------------------------
  // Cart detail
  // ---------------------------------------------------------------------------------------------
  {
    Name: 'RequestQuote',
    Section: DetailActionSection.Cart,
    Sequence: 1,
    IsEnabled: true,
    ActionName: 'RequestQuote',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: true,
    ActionLabelName: 'COMMON.REQUEST_QUOTE',
    IsPrimaryAction: false,
    Stage: [],
    UserType: LOGGED_IN_ONLY
  },
  {
    Name: 'BeginCheckout',
    Section: DetailActionSection.Cart,
    Sequence: 2,
    IsEnabled: true,
    ActionName: 'BeginCheckout',
    ActionArea: DetailActionArea.Main,
    AlwaysDisplay: true,
    ActionLabelName: 'COMMON.BEGIN_CHECKOUT',
    IsPrimaryAction: true,
    Stage: [],
    UserType: LOGGED_IN_ONLY
  }
];
