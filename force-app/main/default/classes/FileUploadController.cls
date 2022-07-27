/**
 * @description       : 
 * @author            : Anuja Dadheech
 * @group             : 
 * @last modified on  : 07-25-2022
 * @last modified by  : Anuja Dadheech
**/

public with sharing class FileUploadController {
    // Static variable to save the object of the without sharing inner class
  private static SystemContext systemCtx = new SystemContext();

  private without sharing class SystemContext{
      public List<SObject> queryRecords(String query) {
          System.debug(query);
          return Database.query(query);
      }
      public void deleteSingleRecord(Id recordId){
          Database.delete(recordId);
      }
      public Id upsertSingleRecord(SObject record){
          Database.UpsertResult result= Database.upsert(record);
          return result.getId();
      }
  }
  public class FileWrapper{
      @AuraEnabled public Sobject record;
      @AuraEnabled public String versionData;
      @AuraEnabled public String contentDocumentId;
      @AuraEnabled public String contentDocumentLinkRecordId;
  }
  /**
   * 
  * @description 
  * @author Anuja Dadheech | 07-04-2022 
  * @param recordToDelete :  record Id to Delete
  **/
  @AuraEnabled
  public static void deleteFile(String recordToDelete){
      try {
          if( recordToDelete != null ){
              recordToDelete = ued.UserCryptoHelper.doDecrypt(recordToDelete);
              systemCtx.deleteSingleRecord(recordToDelete);
          }
      } catch (Exception e) {
          throw new AuraHandledException(e.getMessage());
      }
  }
  /**
  * @description 
  * @author Anuja Dadheech | 07-04-2022 
  * @param base64  : String to be converted into base 64
  * @param filename  : filename
  * @param recordId  : recordId to add record
  **/
  @AuraEnabled
  public static void uploadFile(String base64, String filename,String recordId,String cvId , String cdlId) {
      try{
          System.debug(base64);
          cvId = cvId != null ? ued.UserCryptoHelper.doDecrypt(cvId) : cvId;
          cdlId = cdlId != null ? ued.UserCryptoHelper.doDecrypt(cdlId) : cdlId;
          ContentVersion contentFile = new ContentVersion(Id = cvId , VersionData = EncodingUtil.base64Decode(base64), Title = filename , PathOnClient = filename, isMajorVersion = false);
          Id recId = systemCtx.upsertSingleRecord(contentFile);
          SObject contentFileRetreived = systemCtx.queryRecords('Select Id,ContentDocumentId from ContentVersion where Id = \'' + recId + '\' LIMIT 1').get(0);
          ContentDocumentLink contentLinkRecord = new ContentDocumentLink(Id = cdlId,ContentDocumentId = (Id)contentFileRetreived.get('ContentDocumentId') , LinkedEntityId = ued.UserCryptoHelper.doDecrypt(recordId) , ShareType = 'V',visibility = 'AllUsers');
          systemCtx.upsertSingleRecord(contentLinkRecord);
      }
      catch(Exception e){
          throw new AuraHandledException(e.getMessage());
      }   
  }
  /**
  * @description 
  * @author Anuja Dadheech | 07-04-2022 
  * @param recordId : recordId to get related files
  * @return SObject : return respective record
  **/
  @AuraEnabled
  public static FileWrapper getFile(String recordId){
      try {
          recordId = ued.UserCryptoHelper.doDecrypt(recordId);
          List<Sobject> records = systemCtx.queryRecords('Select Id,ContentDocumentId from ContentDocumentLink where LinkedEntityId = \'' + recordId + '\' LIMIT 1');
          SObject fileLinkedRecord = records.size() > 0 ? records.get(0) : null;
          if(fileLinkedRecord != null){
              Sobject fileRecord = systemCtx.queryRecords('Select Id , VersionData , Title , FileType , ContentSize from ContentVersion where ContentDocumentId = \'' + fileLinkedRecord.get('ContentDocumentId') + '\' LIMIT 1').get(0);
              fileRecord.put('Id',ued.UserCryptoHelper.doEncrypt((String)fileRecord.get('Id')));
              FileWrapper wr = new FileWrapper();
              wr.record = fileRecord;
              wr.contentDocumentId = ued.UserCryptoHelper.doEncrypt((String)fileLinkedRecord.get('ContentDocumentId'));
              wr.contentDocumentLinkRecordId = ued.UserCryptoHelper.doEncrypt((String)fileLinkedRecord.get('Id'));
              Blob data = (Blob)fileRecord.get('VersionData');
              wr.versionData = EncodingUtil.base64Encode(data);
              return wr;
          }
          return null;
      } catch (Exception e) {
          throw new AuraHandledException(e.getMessage());
      }
  }
}