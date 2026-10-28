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
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
   <?php
			if($access->c) {?>
  	<div class="btn-group" id="right">
						<a href="javascript:void(0);" class="btn btn-primary float-right" onclick="tambahpelanggan();">Tambah</a>
						
	</div><br><br>
	<?php }?>
	  <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
		  <th  class="text-center">Member</th>
          <th  class="text-center">Nama Biaya</th>
		  <th  class="text-center">Jenis Biaya</th>
          <th  class="text-center">Besar biaya</th>
		  <th  class="text-center">Chargebox</th>
          <th  class="text-center">Connector</th>
          <th  class="text-center">Aksi</th>
         <th></th>
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

 <div class="modal fade" id="modaltambah" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h3 class="modal-title text-white">Biaya Member Baru</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
        
              
									<div class="form-group">
                                        <label for="exampleInputSupplier">Biaya</label>
                                        <select class="form-control" name="txtbiaya" id="txtbiaya">

                                           <?php foreach($daftarbiaya as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
                                    </div>
									<div class="form-group">
                                        <label for="exampleInputSupplier">Chargebox</label>
                                        <select class="form-control" name="txtchargebox" id="txtchargebox">

                                           <?php foreach($daftarchargebox as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
                                    </div>
									<div class="form-group">
                                        <label for="exampleInputSupplier">Connector</label>
                                        <select class="form-control" name="txtkonektor" id="txtkonektor">

                                         
                                            <option value=1>1</option>
											<option value=2>2</option>
                                            
										</select>
                                    </div>
									
									 <div class="form-group">
									  <label for="exampleInputOwnerName">Besar Biaya  </label>
									  <input type="number" name="txtbesarbiaya" class="form-control" id="txtbesarbiaya"
											 placeholder="Enter Besar Biaya">
									</div>

                               
			
               
        </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
          <button class="btn btn-primary" id="btn_add" onclick="simpandata();" >Simpan</button>
        </div>
       
      </div>
    </div>
  </div>
  
  
  <div class="modal fade" id="modalubah" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h3 class="modal-title text-white">Ubah Data</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
             
			 <div class="form-group">
                                        <label for="exampleInputSupplier">Biaya</label>
                                        <select class="form-control" name="txtbiayaubah" id="txtbiayaubah" readonly>

                                           <?php foreach($daftarbiaya as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
                                    </div>
									<div class="form-group">
                                        <label for="exampleInputSupplier">Chargebox</label>
                                        <select class="form-control" name="txtchargeboxubah" id="txtchargeboxubah" readonly>

                                           <?php foreach($daftarchargebox as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
                                    </div>
									<div class="form-group">
                                        <label for="exampleInputSupplier">Connector</label>
                                        <select class="form-control" name="txtkonektorubah" id="txtkonektorubah" readonly>

                                         
                                            <option value=1>1</option>
											<option value=2>2</option>
                                            
										</select>
                                    </div>
									
									 <div class="form-group">
									  <label for="exampleInputOwnerName">Besar Biaya  </label>
									  <input type="number" name="txtbesarbiayaubah" class="form-control" id="txtbesarbiayaubah"
											 placeholder="Enter Besar Biaya">
									</div>
			
			
        </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" type="button" data-dismiss="modal">Batal</button>
          <button class="btn btn-primary" id="btn_add" onclick="simpanubah();" >Simpan</button>
        </div>
       
      </div>
    </div>
  </div>
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;
var _idalamat=0;
    $(document).ready(function() {
		
		getdata("<?=  base64_decode($id)        ?>");
	});
	
	$('#modaltambah').on('shown.bs.modal', function() {
  $('#txtnama').focus();
})
	
	function kosong(){
		$('#txtbesarbiaya').val("");
		
		
	}
	function simpandata(){
	    
	  
	
		    var _biaya=$('#txtbiaya').val();
			var _besar=$('#txtbesarbiaya').val() ;
			var _chargebox=$('#txtchargebox').val() ;
			var _konektor=$('#txtkonektor').val() ;
		 
			
		  
		  if(_besar==null || _besar=="") {
			  alert("Besar biaya harus diisi!"); return;
		  }
		  
		  
		  
		
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/simpanbiayamember')?>",
               // dataType : "JSON",
                data : {  id_biaya:_biaya,
					      besar_biaya:_besar,
						  id_jenismember:<?=  base64_decode($id)?>,
						  chargebox_id:_chargebox,
						  connector_id:_konektor,
				
				},
                success: function(response){
					if(response=="sukses"){
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modaltambah').modal('hide');
					kosong();
					}
					else {
						alert("Duplikasi data");
					}
                    
                },
				
            });
	}
	
	function simpanubah(){
		
		 var _biaya=$('#txtbiayaubah').val();
			var _besar=$('#txtbesarbiayaubah').val() ;
			var _chargebox=$('#txtchargeboxubah').val() ;
			var _konektor=$('#txtkonektorubah').val() ;
	
			
		  
		  if(_besar==null || _besar=="") {
			  alert("Besar biaya harus diisi!"); return;
		  }
		  
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/simpanbesarbiayaubah')?>",
               // dataType : "JSON",
                data : { 
							id:_idubah,
							id_biaya:_biaya,
					      besar_biaya:_besar,
						  id_jenismember:<?=  base64_decode($id)?>,
						  chargebox_id:_chargebox,
						  connector_id:_konektor,
							
						},
                success: function(response){
					alert(response);
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modalubah').modal('hide');
                    
                },
				
            });
	}
	
	function hapus(id){
		if (confirm("Yakin hapus?")==false) return;
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/hapusbiayamember')?>",
               // dataType : "JSON",
                data : { id:id,
						
				
				},
                success: function(response){
					
                    
                    var table = $('#list-data').DataTable();
					table.draw(false);;
					
					
                    
                },
				
            });
	}
	
	function ubah(id){
		 	
		$.ajax({
                    url : "<?php echo base_url('member/getbesarbiayaubah');?>",
                    method : "POST",
                   data: {id:id},
                   dataType : 'json',
                    success: function(data){
					
						_idubah=data.id;
					  $('[name="idubah"]').val(data.id);
					  $('[name="txtbiayaubah"]').val(data.id_biaya);
                      $('[name="txtbesarbiayaubah"]').val(data.besar_biaya);
					  $('[name="txtchargeboxubah"]').val(data.chargebox_id);
					  $('[name="txtkonektorubah"]').val(data.connector_id);
					 
				    $('#modalubah').modal('show');
 
                    }
                });
               
	 }
	function getdata(id){
		
		var datatable=   $('#list-data').DataTable( {
      
        "processing" : true,
        "oLanguage": {
                "sLengthMenu": "Tampilkan _MENU_ data per halaman",
                "sSearch": "Pencarian: ",
                "sZeroRecords": "Maaf, tidak ada data yang ditemukan",
               "sInfo": "Menampilkan _START_ s/d _END_ dari _TOTAL_ data",
				//"sInfo": "",
                "sInfoEmpty": "Menampilkan 0 s/d 0 dari 0 data",
                "sInfoFiltered": "(di filter dari _MAX_ total data)",
                "oPaginate": {
                    "sFirst": "<<",
                    "sLast": ">>",
                    "sPrevious": "<",
                    "sNext": ">"
               }
            },
  columnDefs: [{
        targets: [0],
        orderable: false
     },
	 {targets: [-1],
         visible: false
     },
	 {targets: [-2],
        "className": "text-center",
     },
	{targets: [3],
         className: 'right'
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('member/biayamemberjson/'); ?>"+id, // json datasource
          type: "post",
			
          
        },
		
		
		
		"columns": [
			
			{ "data": "nama_member"},
			{ "data": "nama_biaya"},
			
			{ "data": "jenis_biaya"},
			{ "data": "besar_biaya"},
			{ "data": "chargebox_id"},
			{ "data": "connector_id"},
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
