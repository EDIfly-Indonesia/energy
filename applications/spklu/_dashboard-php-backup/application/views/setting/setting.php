

<div class="box">
 
  <!-- /.box-header -->
  <div class="box-body">
   <div class="card-body">
      
<div class="card">
   
    <div class="card-body">
        
       <form id="form-update-posisi" method="POST">
	   <input type="hidden" name="id" value="1">
        <div class="form-group row">
            <label for="" class="col-md-3 col-form-label">Batas Waktu bayar</label>
            <div class="col-md-6">
                <div class="row">
                    <div class="col-md-5">
                        <input type="datetime-local" class="form-control"  name="txttgl1" id="txttgl1" value=<?php echo $tanggal;?> required>
                    </div>
                   
                </div>
            </div>
        </div>
		
		 <div class="form-group">
      <div class="col-md-6">
          <button type="submit" class="form-control btn btn-primary"> <i class="glyphicon glyphicon-ok"></i> Update Data</button>
      </div>
    </div>
       </form> 
      
		
		
       
       
        
    </div>
</div>


    </div>
  </div>
</div>

 <script src="<?php echo base_url(); ?>assets/plugins/jQuery/jquery-2.2.3.min.js"></script>

