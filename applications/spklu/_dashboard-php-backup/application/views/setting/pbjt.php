
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
      
            <div class="col-md-6">
                <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Nilai Pbjt (%)</label>
                    <div class="col-md-5">
                        <input type="text" id="txtpbjt" class="form-control" name="txtpbjt" value="<?=$nilaipbjt?>">
                    </div>
                     <div class="col-md-3">
                     <button type="button" class="btn btn-primary" onclick="simpanpbjt();return false;">Simpan</button>
                     </div>
                </div>
                
                </div>
			
			</div>
    <div class="card-footer">
    
   
     
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
	

	
    function simpanpbjt(){
	
	var _pbjt=$('#txtpbjt').val();
	
	
	if(_pbjt==""|| _pbjt==0) {
		alert("Isi dulu nilai pbjt"); return;
	}
	
	

	
	

 	if (confirm("Simpan data PBJT?")==false) return;

            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('setting/simpanpbjt')?>",
               // dataType : "JSON",
                data : { 
                pbjt: _pbjt,
				
				},
                success: function(response){
				
					if(response=="sukses"){
				        alert("Pbjt berhasil disimpan,harap restart servide docker API anda!");
							
					}
				},
				
            });
	
		}
		
		
		
	
		
	

		
</script>
