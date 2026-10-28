
<style>

#right{float:right}

.right {
                text-align: right;
            }
			.center {
                text-align: center;
            }
</style>

<div class="msg" style="display:none;">
  <?php  
 
  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
  
        <div class="col-12 ">
          <div class="card">
          <div class="card mb-3">
    
    <div class="card-body" id="segar">
	<br>
      
            <div class="col-md-12">
                <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">ID admin wallet production</label>
                    <div class="col-md-5">
                        <input type="text" id="txtadminwallet" class="form-control" name="txtadminwallet" value="<?=$adminwallet?>">
                    </div>
                     
                </div>
				 <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">ID admin wallet Sandbox</label>
                    <div class="col-md-5">
                        <input type="text" id="txtadminwalletsandbox" class="form-control" name="txtadminwalletsandbox" value="<?=$adminwalletsandbox?>">
                    </div>
                    
                </div>
                
                </div>
			
			</div>
    <div class="card-footer">
     <div class="col-md-3">
                     <button type="button" class="btn btn-primary" onclick="simpanadminwallet();return false;">Simpan</button>
                     </div>
   
     
	</div>
	
</div>
          </div>
          
        </div>
       
     
	</div>
  </div>
</div>

 
  

<div id="tempat-modal"></div>

<script type="text/javascript">

var araydatabarang=[];
    $(document).ready(function() {
      // cetakfaktur();
     
		
	});
	

	
    function simpanadminwallet(){
	
	var _prod=$('#txtadminwallet').val();
	var _sandbox=$('#txtadminwalletsandbox').val();
	
	if(_prod==""|| _prod==0) {
		alert("Isi dulu nilai ID wallet production"); return;
	}
	if(_sandbox==""|| _sandbox==0) {
		alert("Isi dulu nilai ID wallet sandbox"); return;
	}
	

	
	

 	if (confirm("Simpan data ID Wallet?")==false) return;

            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('setting/simpanadminwallet')?>",
               // dataType : "JSON",
                data : { 
                prod: _prod,
				sandbox: _sandbox,
				
				},
                success: function(response){
				
					if(response=="sukses"){
				        alert("ID wallet berhasil disimpan,harap restart servide docker API anda!");
							
					}
				},
				
            });
	
		}
		
		
		
	
		
	

		
</script>
