/**
* @description       :
* @author            : Anuja Dadheech
* @group             :
* @last modified on  : 07-25-2022
* @last modified by  : Anuja Dadheech
**/

public with sharing class ProviderApplicationFormController {
    // Static variable to save the object of the without sharing inner class
    private static SystemContext systemCtx = new SystemContext();
    
    /**
* @description Insert/Upsert the Contact(Provider)
* @param     con (Contact): Contact(Provider) record
* @return    Id:  Returns the record-Id of the contact
**/
    
    @AuraEnabled
    public static String saveContact(Contact con) {
        try {
            String encryptedId = con.Id == null ? null : con.Id;
            con.Id = con.Id != null ? ued.UserCryptoHelper.doDecrypt(con.Id) : con.Id;
            String recId = systemCtx.upsertSingleRecord(con);
            recId = encryptedId == null ? ued.UserCryptoHelper.doEncrypt(recId) : encryptedId;
            System.debug('encrypted contact Id -> ' + recId);
            return recId;
        } catch (Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    /**
* @description Insert the related records of the contact
* @param     sObjectData (String): Related object data to be created
* @param     recordsToDelete (String): Related object recordId to delete
* @param     sObjectName (String): The API name of the sObject
**/
    
    @AuraEnabled
    public static List<String> saveRelatedRecords(
        String sObjectData,
        String recordsToDelete,
        String sObjectName
    ) {
        try {
            System.debug('sobject' + sObjectData);
            List<String> recordDeleteList = (List<String>) JSON.deserialize(
                recordsToDelete,
                List<String>.class
            );
            if (recordDeleteList.size() > 0) {
                List<Id> records = new List<Id>();
                for(Integer i = 0 ; i < recordDeleteList.size() ; i++ ){
                    records.add(ued.UserCryptoHelper.doDecrypt(recordDeleteList[i]));
                }
                systemCtx.deleteMultipleRecords(records);
            }
            String listType = 'List<' + sObjectName + '>';
            List<SObject> recordsToUpsert = new List<SObject>();
            recordsToUpsert = (List<SObject>) JSON.deserialize(
                sObjectData,
                Type.forName(listType)
            );
            List<Id> ids = null;
            List<String> recordIds = null;
            if (recordsToUpsert.size() > 0) {
                for(Integer i = 0 ; i < recordsToUpsert.size() ; i++){
                    boolean fieldExists = recordsToUpsert[i].getSobjectType().getDescribe().fields.getMap().keySet().contains('provider__c');
                    boolean managedPackageFieldExists = recordsToUpsert[i].getSobjectType().getDescribe().fields.getMap().keySet().contains('verifiable__provider__c');
                    if((String)recordsToUpsert[i].get('Id') != null){
                        recordsToUpsert[i].put('Id',ued.UserCryptoHelper.doDecrypt((String)recordsToUpsert[i].get('Id')));
                    }
                    System.debug(fieldExists);
                    System.debug(managedPackageFieldExists);
                    if(fieldExists){
                        recordsToUpsert[i].put('Provider__c',ued.UserCryptoHelper.doDecrypt((String)recordsToUpsert[i].get('Provider__c')));
                        System.debug((String)recordsToUpsert[i].get('Provider__c'));
                    }
                    else if(managedPackageFieldExists){
                        recordsToUpsert[i].put('verifiable__Provider__c',ued.UserCryptoHelper.doDecrypt((String)recordsToUpsert[i].get('verifiable__Provider__c')));
                        System.debug((String)recordsToUpsert[i].get('verifiable__Provider__c'));
                    }
                }
                ids = systemCtx.upsertMultipleRecords(recordsToUpsert);
                recordIds = new List<String>();
                for(Integer i = 0 ; i < ids.size() ; i++){
                    recordIds.add((String)ued.UserCryptoHelper.doEncrypt(ids[i]));
                }
            }
            return recordIds;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled
    public static String saveDisclosureRecords(String sObjectData, String contactId) {
        try {
            System.debug('sobject' + sObjectData);
            
            verifiable__Disclosure_Question__c rec = new verifiable__Disclosure_Question__c();
            rec.Data__c = sObjectData;
            rec.verifiable__Provider__c = ued.UserCryptoHelper.doDecrypt(contactId);
            System.debug('contactId' + contactId);
            System.debug(rec.verifiable__Provider__c);
            Id ids = systemCtx.upsertSingleRecord(rec);
            System.debug('ids' + ids);
            return ued.UserCryptoHelper.doEncrypt(ids);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    /**
* @description Gets the records of the sObject
* @param     recId (String): The Id of the record
* @param     fields (String): The fields to fetch
* @param     sObjectName (String): The API name of the sObject
* @return    SObject:  Returns the record of the SObject
**/
    
    @AuraEnabled
    public static SObject getRecord(
        String recId,
        String fields,
        String sObjectName
    ) {
        try {
            System.debug('encrypted record id -> ' + recId);
            String encryptedId = recId;
            recId = ued.UserCryptoHelper.doDecrypt(recId);
            String query =
                'Select ' +
                fields +
                ' from ' +
                sObjectName +
                ' where Id = \'' +
                recId +
                '\' LIMIT 1';
            Sobject record = systemCtx.querySingleRecord(query);
            record.put('Id',encryptedId);
            return record;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    /**
* @description Gets the records of related objects of Contact
* @param     recId (String): The Id of the record
* @param     fields (String): The fields to fetch
* @param     sObjectName (String): The API name of the sObject
* @param     relationshipField (String): The API Name of the lookup field of Contact Object on it's related object
* @return    SObject:  Returns the records of the related SObjects
**/
    
    @AuraEnabled
    public static List<SObject> getRelatedRecords(
        String recId,
        String fields,
        String sObjectName,
        String relationshipField
    ) {
        try {
            recId = ued.UserCryptoHelper.doDecrypt(recId);
            String query =
                'Select ' +
                fields +
                ' from ' +
                sObjectName +
                ' where ' +
                relationshipField +
                ' = \'' +
                recId +
                '\' ';
            List<SObject> records = systemCtx.queryMultipleRecords(query);
            for(Integer i = 0 ; i < records.size() ; i++){
                boolean fieldExists = records[i].getSobjectType().getDescribe().fields.getMap().keySet().contains('id');
                if(fieldExists){
                    records[i].put('Id',ued.UserCryptoHelper.doEncrypt((String)records[i].get('Id')));
                }
            }
            return records;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    /**
* @description Without Sharing Inner class
**/
    
    private without sharing class SystemContext {
        public SObject querySingleRecord(String query) {
            return Database.query(query);
        }
        
        public List<SObject> queryMultipleRecords(String query) {
            return Database.query(query);
        }
        
        public Id upsertSingleRecord(SObject record) {
            Database.UpsertResult result = Database.upsert(record);
            return result.getId();
        }
        
        public List<Id> upsertMultipleRecords(List<SObject> records) {
            Database.UpsertResult[] srList = Database.upsert(records);
            List<Id> recordIds = new List<Id>();
            for (Database.UpsertResult result : srList) {
                if (result.isSuccess()) {
                    recordIds.add(result.getId());
                }
            }
            return recordIds;
        }
        
        public void deleteMultipleRecords(List<Id> records) {
            Database.delete(records);
        }
    }
}