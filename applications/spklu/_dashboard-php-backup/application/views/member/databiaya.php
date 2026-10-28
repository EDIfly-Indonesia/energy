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
          <th  class="text-center">Nama Biaya</th>
		  
		  <th  class="text-center">Mitra</th>
		  <th  class="text-center">Jenis Biaya</th>
          <th  class="text-center">Harga default</th>
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
          <h3 class="modal-title text-white">Macam Biaya Baru</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
         <div class="form-group">
                  <label for="exampleInputOwnerName">Nama Biaya  </label>
                  <input type="text" name="txtnamabiaya" class="form-control" id="txtnamabiaya"
                         placeholder="Enter Nama Biaya">
                </div>

               
				
				<div class="form-group">
                                        <label for="exampleInputSupplier">Jenis Biaya</label>
                                        <select class="form-control" name="txtjenis" id="txtjenis">

                                           <option value="pertransaksi">Per Transaksi</option>
										   <option value="perjam">Per Jam</option>
										   <option value="perkwh">Per KWH</option>
                                          
										</select>
                                    </div>

				<div class="form-group">
                  <label for="exampleInputEmail1">Default Harga</label>
                  <input type="number" name="txtdefaultharga" class="form-control" id="txtdefaultharga"
                         placeholder="Enter Default Harga">
                </div>
              
				<?php
                                $idtipe=getidtipe();
                                if($idtipe==1){
                                ?>
                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Mitra</label>
                                        <select class="form-control" name="txtmitra" id="txtmitra">

                                           <?php foreach($daftarmitra as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
                                    </div>
                                
								<?php
                                }
                                ?>
			
               
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
                  <label for="exampleInputOwnerName">Nama Biaya  </label>
                  <input type="text" name="txtnamabiayaubah" class="form-control" id="txtnamabiayaubah"
                         placeholder="Enter Nama Biaya">
                </div>

              
				<div class="form-group">
                                        <label for="exampleInputSupplier">Jenis Biaya</label>
                                        <select class="form-control" name="txtjenisubah" id="txtjenisubah">

                                           <option value="pertransaksi">Per Transaksi</option>
										   <option value="perjam">Per Jam</option>
										   <option value="perkwh">Per KWH</option>
                                          
										</select>
                                    </div>
				<div class="form-group">
                  <label for="exampleInputEmail1">Default Harga</label>
                  <input type="number" name="txtdefaulthargaubah" class="form-control" id="txtdefaulthargaubah"
                         placeholder="Enter Default Harga">
                </div>
              
				<?php
                                $idtipe=getidtipe();
                                if($idtipe==1){
                                ?>
                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Mitra</label>
                                        <select class="form-control" name="txtmitraubah" id="txtmitraubah">

                                           <?php foreach($daftarmitra as $u):?>
                                            <option value="<?php echo $u->id?>"><?php echo $u->name?></option>
                                            <?php endforeach;?>
										</select>
                                    </div>
                                
								<?php
                                }
                                ?>
			
			
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
		
		getdata();
	});
	
	$('#modaltambah').on('shown.bs.modal', function() {
  $('#txtnamabiaya').focus();
})
	
	function kosong(){
		$('#txtnamabiaya').val("");
		$('#txtdefaultharga').val("");
		
		
	}
	function simpandata(){
	    
	  
	
		    var _namabiaya=$('#txtnamabiaya').val();
			
			var _jenis=$('#txtjenis').val() ;
			var _mitra=$('#txtmitra').val() || 0 ;
			var _default=$('#txtdefaultharga').val();
		   
          
			
		  
		  if(_namabiaya==null || _namabiaya=="") {
			  alert("Nama biaya harus diisi!"); return;
		  }
		  
		 
		  
		  if(_default==null || _default=="") {
			  alert("Biaya defaullt harus diisi!"); return;
		  }
		  
		
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/simpandatabiaya')?>",
               // dataType : "JSON",
                data : {  nama_biaya:_namabiaya,
					      mitra:_mitra,
						  jenis_biaya:_jenis,
						 
						  default_biaya :_default 
				
				},
                success: function(response){
			
                  
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modaltambah').modal('hide');
					kosong();
                    
                },
				
            });
	}
	
	function simpanubah(){
	
			var _namabiaya=$('#txtnamabiayaubah').val();
			
			var _mitra=$('#txtmitraubah').val() || 0 ;
			var _default=$('#txtdefaulthargaubah').val();
			var _jenis=$('#txtjenisubah').val();
			
		  if(_namabiaya==null || _namabiaya=="") {
			  alert("Nama biaya harus diisi!"); return;
		  }
		  
		 
		  
		  if(_default==null || _default=="") {
			  alert("Biaya defaullt harus diisi!"); return;
		  }
		 
		 
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('member/simpanbiayaubah')?>",
               // dataType : "JSON",
                data : { 
							id:_idubah,
							 nama_biaya:_namabiaya,
							mitra:_mitra,
							jenis_biaya:_jenis,
							
							default_biaya :_default 
							
						},
                success: function(response){
					
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
                url  : "<?php echo base_url('member/hapusbiaya')?>",
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
                    url : "<?php echo base_url('member/getdatabiayaubah');?>",
                    method : "POST",
                   data: {id:id},
                   dataType : 'json',
                    success: function(data){
						
						_idubah=data.id_biaya;
					  $('[name="idubah"]').val(data.id_biaya);
					  $('[name="txtnamabiayaubah"]').val(data.nama_biaya);
					  $('[name="txtjenisubah"]').val(data.jenis_biaya);
                     
					  $('[name="txtmitraubah"]').val(data.id_mitra);
					  $('[name="txtdefaulthargaubah"]').val(data.default_biaya);
					 
				    $('#modalubah').modal('show');
 
                    }
                });
               
	 }
	function getdata(){
		
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
	{targets: [4],
         className: 'right'
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('member/databiayajson'); ?>", // json datasource
          type: "post",
			  // method  , by default get
          
        },
		// <th  class="text-center">Nama Biaya</th>
		  // <th  class="text-center">In English</th>
		  // <th  class="text-center">Tenant</th>
          // <th  class="text-center">Harga default</th>
          // <th  class="text-center">Aksi</th>
		"columns": [
			
			{ "data": "nama_biaya"},
			
			{ "data": "mitra"},
			{ "data": "jenis_biaya"},
			{ "data": "default_biaya"},
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahpelanggan(){
		 $('#modaltambah').modal('show');
	}
	
</script>
