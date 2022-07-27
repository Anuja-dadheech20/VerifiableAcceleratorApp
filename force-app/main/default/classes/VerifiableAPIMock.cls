@IsTest
global class VerifiableAPIMock implements HttpCalloutMock{
    
    global VerifiableAPIMock(string responseType){
        this.responseType = responseType;
    }
    
    global HTTPResponse respond(HTTPRequest req) {
        HttpResponse res = new HttpResponse();
        res.setHeader('Content-Type', 'application/json');
        
        if(responseType=='createProvider'){
            res.setBody(createNewProviderResponse);
        }else if(responseType=='License'){
            res.setBody(licenseResponse);
        }else if(responseType=='NPI'){
            res.setBody(npiResponse);               
        }else if(responseType=='DEA'){
            res.setBody(deaResponse);
        }
        res.setStatusCode(200);
        return res;
        
    }
    
    private string responseType;
    static String licenseResponse = '{"providerId":"4834bcdc-4a64-444d-966b-1a6fe381da24","licenseNumber":"MD441612","state":"CA","jobStatus":"Idle","nonVerifiedInfo":{"issueDate":"2019-08-24T14:15:22Z","expirationDate":"2019-08-24T14:15:22Z","status":"string"},"currentVerificationStatus":"Found","currentVerification":{"originalStatus":"Found","status":"Found","started":"2019-08-24T14:15:22Z","processingTime":0,"results":[{"name":"string","licenseType":"string","licenseStatus":"string","licenseNumber":"string","address":"string","issued":"2019-08-24T14:15:22Z","expires":"2019-08-24T14:15:22Z","isExpired":true,"screenshots":["string"],"disciplinaryActions":{"type":"Form","data":null},"additionalProperties":{"type":"Form","data":null},"problems":["NameMismatch"]}],"verificationSource":{"name":"string","url":"string"},"failureReason":{"messageTemplate":"string","messageParams":{"property1":"string","property2":"string"}},"correctResultIndex":0,"export":"string","id":"497f6eca-6276-4993-bfeb-53cbbbba6f08"},"restrictionStatus":"None","approvedStatus":"Pending","isPrimary":true,"id":"497f6eca-6276-4993-bfeb-53cbbbba6f08","isCurrentlyPracticing":true,"prescriptiveAuthority":"RequiredMet","collaboratingProviderId":"79ac5e55-1b65-4bd8-a907-2b31ef7aa4a6","licenseType":{"id":"497f6eca-6276-4993-bfeb-53cbbbba6f08","name":"string","source":{"id":"497f6eca-6276-4993-bfeb-53cbbbba6f08","name":"string","state":"AL","availability":"Available","status":{"issue":"PossibleIssue","averageProcessingTime":0,"averageFailureRate":0},"isDegraded":true,"isDpsVerificationSource":true,"url":"http://example.com"}}}';
    static String deaResponse = '{"providerId":"4834bcdc-4a64-444d-966b-1a6fe381da24","registrationNumber":"FA3151672","currentVerification":{"id":"497f6eca-6276-4993-bfeb-53cbbbba6f08","timestamp":"2019-08-24T14:15:22Z","lastUpdated":"2019-08-24T14:15:22Z","lastSync":"2019-08-24T14:15:22Z","status":"Found","originalStatus":"Found","results":{"businessActivityCode":"string","drugSchedules":["string"],"expirationDate":"2019-08-24T14:15:22Z","name":"string","additionalCompanyInfo":"string","address1":"string","address2":"string","city":"string","state":"string","zipCode":"string","businessActivitySubCode":"string","paymentIndicator":"Paid","active":true,"problems":["NameMismatch"],"businessActivity":"string"},"deaxResults":{"number":"string","certifiedPatientLimit":0}}}';
    static String npiResponse = '{"number":0,"data":[{"id":"497f6eca-6276-4993-bfeb-53cbbbba6f08","number":0,"addresses":[{"type":"Location","addressLine1":"string","addressLine2":"string","city":"string","state":"string","zip":"string","country":"string","phone":"string","fax":"string"}],"certificationDate":"2019-08-24T14:15:22Z","enumerationDate":"2019-08-24T14:15:22Z","lastUpdated":"2019-08-24T14:15:22Z","names":[{"type":"Other","lastName":"string","firstName":"string","middleName":"string","namePrefix":"string","nameSuffix":"string","credential":"string"}],"isSoleProprietor":true,"gender":"Unknown","otherIdentifiers":[{"type":"Other","identifier":"string","issuer":"string","state":"string"}],"taxonomies":[{"code":"string","description":"string","licenseNumber":"string","isPrimary":true,"state":"string","group":"string"}],"isActive":true,"deactivationReason":"string"}],"lastSync":"2019-08-24T14:15:22Z"}';
    static String createNewProviderResponse = '{"id":"497f6eca-6276-4993-bfeb-53cbbbba6f08","firstName":"string","lastName":"Test","dateOfBirth":"2019-08-24T14:15:22Z","ssn":"ABC786543","credentialingStatus":"string","credentialedDate":"2019-08-24T14:15:22Z","npi":78954621,"aliases":[{"firstName":"string","lastName":"string"}],"addresses":[{"state":"AL","zipCode":"string","city":"string","addressLine1":"string","addressLine2":"string","type":"Unspecified"}],"emails":[{"email":"string","type":"Unspecified"}],"phone":"string","languages":["string"],"recredentialedDates":["2019-08-24T14:15:22Z"],"providerType":{"id":"497f6eca-6276-4993-bfeb-53cbbbba6f08","name":"string"}}';
    
}