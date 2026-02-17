/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Administration from './pages/Administration';
import Calendar from './pages/Calendar';
import CompanySignup from './pages/CompanySignup';
import Customers from './pages/Customers';
import Dashboard from './pages/Dashboard';
import EmailSent from './pages/EmailSent';
import EmailVerification from './pages/EmailVerification';
import EmbedQuote from './pages/EmbedQuote';
import EmbedTokens from './pages/EmbedTokens';
import JobDetail from './pages/JobDetail';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import PublicQuote from './pages/PublicQuote';
import PublicQuoteRequest from './pages/PublicQuoteRequest';
import QuoteBuilder from './pages/QuoteBuilder';
import QuoteDetail from './pages/QuoteDetail';
import Quotes from './pages/Quotes';
import Resources from './pages/Resources';
import TestEmbed from './pages/TestEmbed';
import UserLogin from './pages/UserLogin';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Administration": Administration,
    "Calendar": Calendar,
    "CompanySignup": CompanySignup,
    "Customers": Customers,
    "Dashboard": Dashboard,
    "EmailSent": EmailSent,
    "EmailVerification": EmailVerification,
    "EmbedQuote": EmbedQuote,
    "EmbedTokens": EmbedTokens,
    "JobDetail": JobDetail,
    "Landing": Landing,
    "Profile": Profile,
    "PublicQuote": PublicQuote,
    "PublicQuoteRequest": PublicQuoteRequest,
    "QuoteBuilder": QuoteBuilder,
    "QuoteDetail": QuoteDetail,
    "Quotes": Quotes,
    "Resources": Resources,
    "TestEmbed": TestEmbed,
    "UserLogin": UserLogin,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
    Layout: __Layout,
};