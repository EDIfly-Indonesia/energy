
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
                    <label for="" class="col-md-4 col-form-label">Nilai PPN (%)</label>
                    <div class="col-md-5">
                        <input type="text" id="txtppn" class="form-control" name="txtppn" value="<?=$nilaippn?>">
                    </div>
                     <div class="col-md-3">
                     <button type="button" class="btn btn-primary" onclick="simpanppn();return false;">Simpan</button>
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
	

	
    function simpanppn(){
	
	var _ppn=$('#txtppn').val();
	
	
	if(_ppn==""|| _ppn==0) {
		alert("Isi dulu nilai ppn"); return;
	}
	
	

	
	

 	if (confirm("Simpan data PPN?")==false) return;

            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('setting/simpanppn')?>",
               // dataType : "JSON",
                data : { 
                ppn: _ppn,
				
				},
                success: function(response){
				
					if(response=="sukses"){
				        alert("PPN berhasil disimpan,harap restart servide docker API anda!");
							
					}
				},
				
            });
	
		}
		
		
		
	
		
	

		
</script>
