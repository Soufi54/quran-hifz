# QuranDuel - Production Checklist

## Accounts & Credentials
- [ ] Apple Developer Account ($99/year) - https://developer.apple.com
- [ ] Google Play Developer Account ($25 one-time) - https://play.google.com/console
- [ ] EAS Build credentials setup (`eas credentials`)
- [ ] Update `eas.json` with real Apple Team ID and ASC App ID
- [ ] Create `google-services.json` service account key for Play Store uploads

## Supabase
- [ ] Supabase production instance created
- [ ] Environment variables configured for production
- [ ] Database migrations applied
- [ ] Row Level Security (RLS) policies verified

## App Store Assets
- [ ] App icon (1024x1024 PNG, no transparency, no rounded corners)
- [ ] App Store screenshots:
  - [ ] 6.7" (iPhone 15 Pro Max) - 1290 x 2796
  - [ ] 6.5" (iPhone 14 Plus) - 1284 x 2778
  - [ ] 5.5" (iPhone 8 Plus) - 1242 x 2208
- [ ] App Store description (FR)
- [ ] App Store keywords
- [ ] App Store subtitle

## Play Store Assets
- [ ] Play Store screenshots (min 2, up to 8 per device type)
- [ ] Feature graphic (1024 x 500)
- [ ] Play Store description (FR)
- [ ] Play Store short description (max 80 chars)

## Legal & Compliance
- [ ] Privacy policy URL (required for both stores)
- [ ] Terms of service URL
- [ ] App review guidelines compliance check (Apple)
- [ ] Content rating questionnaire (Google Play)
- [ ] GDPR compliance (if applicable for EU users)

## Testing
- [ ] TestFlight internal testing (iOS)
- [ ] Google Play internal testing track
- [ ] Test on iPhone SE (small screen)
- [ ] Test on iPhone 15 Pro Max (large screen)
- [ ] Test on iPad (tablet)
- [ ] Test on Android phone (various sizes)
- [ ] Test Arabic text rendering on all devices
- [ ] Test audio playback
- [ ] Test offline mode / no network
- [ ] Verify AsyncStorage data persistence

## Build & Deploy
- [ ] Run `eas build --platform ios --profile production`
- [ ] Run `eas build --platform android --profile production`
- [ ] Run `eas submit --platform ios`
- [ ] Run `eas submit --platform android`
- [ ] Verify app version and build numbers are correct

## Post-Launch
- [ ] Monitor crash reports (Sentry or similar)
- [ ] Monitor App Store reviews
- [ ] Monitor Play Store reviews
- [ ] Set up analytics (optional)
