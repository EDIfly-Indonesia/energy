<div class="content-wrapper">
  <!-- headerContent -->
  <?php echo @$_headerContent; ?>
  

  <!-- Main content -->
  <section class="content">
    <?php echo @$_mainContent; ?>
  </section>
</div>

 <div class="modal fade" id="modalganti" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h3 class="modal-title text-white">Ubah Password</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
              
          <div class="form-group">
                                    <label for="exampleInputOwnerName">Password lama</label>
                                    <input type="password" name="old_password" class="form-control" id="old_password"
                                           >
                                </div>

                              


                            

                                <div class="form-group">
                                    <label for="exampleInputAddress">Password baru</label>
                                    <input type="password" name="new_password" class="form-control" id="new_password"
                                          
                                           >
                                </div>
                                 <div class="form-group">
                                    <label for="exampleInputAddress">Konfirmasi Password baru</label>
                                    <input type="password" name="new_password2" class="form-control" id="new_password2"
                                          
                                           >
                                </div>
                                
                              
			
			
        </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
          <button class="btn btn-primary" id="btn_add" onclick="simpanpassword();" >Simpan</button>
        </div>
       
      </div>
    </div>
  </div>
  <script>
  
  
   $(document).ready(function() {
        var url = window.location; 
        var element = $('ul.sidebar-menu a').filter(function() {
        return this.href == url || url.href.indexOf(this.href) == 0; }).parent().addClass('active');
        if (element.is('li')) { 
             element.addClass('active').parent().parent('li').addClass('active')
         }
    });
  
  
  
  
      	function gantipassword(){
		 $('#modalganti').modal('show');
	}
	
		function simpanpassword(){
	
		 var _old=$('#old_password').val();
		var _new=$('#new_password').val();
		
		var _new2=$('#new_password2').val();
		
			
			//var _idagen=$('#txtagenubah').val();
          
		  if(_old==null || _old=="") {
			  alert("Password lama harus diisi!"); return;
		  }
		  
		    if(_new==null || _new=="") {
			  alert("Password baru harus diisi!"); return;
		  }
		  
		    if(_new2==null || _new2=="") {
			  alert("Konfirmas Password harus diisi!"); return;
		  }
		  
		   if(_new2!=_new) {
			  alert("Password baru dan konfirmasi tidak sama"); return;
		  }
		  
		 
		 
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('auth/simpanpassword')?>",
               // dataType : "JSON",
                data : { 
							old_password:_old,
							new_password:_new,
						
							
				
				},
                success: function(response){
				if(response=='sukses')
                  
					
					$('#modalganti').modal('hide');
					else
					alert(response);
                    
                },
				
            });
	}
	
  </script>