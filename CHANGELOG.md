# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-01-20

### Added
- Production-ready Twilio SMS notification provider for Medusa v2
- Comprehensive error handling with retry logic
- E.164 phone number format validation
- Support for both phone numbers and messaging service SIDs
- MMS support with media URL validation
- Configurable retry attempts and delays
- Comprehensive logging (debug, info, warn, error levels)
- TypeScript types and interfaces
- 100% test coverage with comprehensive unit tests
- Production documentation with troubleshooting guide

### Features
- **SMS/MMS Sending**: Send text and multimedia messages via Twilio
- **Flexible Configuration**: Support for phone numbers or messaging service SIDs
- **Retry Logic**: Automatic retry with exponential backoff for failed sends
- **Validation**: Phone number format validation and input sanitization
- **Error Handling**: Proper error categorization and handling
- **Logging**: Production-grade logging for monitoring and debugging
- **Type Safety**: Full TypeScript support with exported types
- **Testing**: Comprehensive test suite with 100% coverage

### Technical Details
- Compatible with Medusa v2 (^2.4.0)
- Node.js >=20 required
- Built with TypeScript
- Uses Twilio SDK v5.3.1
- Follows Medusa's official provider patterns