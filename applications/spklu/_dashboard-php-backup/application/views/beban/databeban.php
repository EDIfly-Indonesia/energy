<style>
.table th {
  text-align: center;
}
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
       <div class="form-group row">
      <label for="" class="col-md-1 col-form-label">Toko</label>
                    <div class="col-md-2">
    <select name="txtshop" id="txtshop" class="form-control" data-placeholder="Pilih Toko" onchange="getdata(this.value);" required>
                           <option value="0">Semua</option>
                          <?php foreach($daftartoko as $u):?>
                                <option value="<?php echo $u->id?>"><?php echo $u->namatoko?></option>
                            <?php endforeach;?>
                        </select>
                        </div>
     </div>
   <?php
			if($access->c) {?>
  	<div class="btn-group" id="right">
						<a href="javascript:void(0);" class="btn btn-primary float-right" onclick="tambahbeban();">Tambah</a>
						
	</div><br><br>
	<?php }?>
	  <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped">
      <thead>
       <tr>
          <th>No.Akun</th>
          <th>Nama.Akun</th>
          <th>Toko</th>
          
          <th>Aksi</th>
         <th></th>
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

 <div class="modal fade" id="modaltambahbeban" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h3 class="modal-title text-white">Akun beban Baru</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
                            <div class="form-group">
                                    <label for="exampleInputCustomerName">Nama Beban</label>
                                    <input type="text" name="txtnamabeban" class="form-control" id="txtnamabeban"
                                           placeholder="Nama beban">
                                </div>
                            <div class="form-group">
                                    <label for="exampleInputCustomerName">Nomor Beban</label>
                                    <input type="text" name="txtnomorbeban" class="form-control" id="txtnomorbeban"
                                           placeholder="Nama nomor">
                                </div>
                               
                            <div class="form-group">

                                    <div class="form-group">
                                        <label for="exampleShopStatus">Status</label>
                                        <select class="form-control" name="txtstatus" id="txtstatus">

                                            <option value="1">Aktif</option>
                                            <option value="0">Tidak aktif</option>

                                        </select>


                                    </div>
                                </div>


                                <?php
                                $idtipe=getidtipe();
                                if($idtipe==3){
                                  
                                ?>
                                <div class="form-group">

                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Pilih Toko</label>
                                        <select class="form-control" name="txttoko" id="txttoko">

                                             <?php foreach($daftartoko as $u):?>
                                    <option value="<?php echo $u->id?>"><?php echo $u->namatoko?></option>
                                <?php endforeach;?>
                                </select>
                                        </div>
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
  
  
   <div class="modal fade" id="modalubahbeban" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header bg-primary">
          <h3 class="modal-title text-white">Ubah akun beban</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
          <div class="form-group">
                                    <label for="exampleInputCustomerName">Nama Beban</label>
                                    <input type="text" name="txtnamabebanubah" class="form-control" id="txtnamabebanubah"
                                           placeholder="Nama Beban">
                                           <input type="hidden" name="idubah" class="form-control"
                                           id="idubah"
                                           >
                                </div>
                                
                                <div class="form-group">
                                    <label for="exampleInputCustomerName">Nomor akun</label>
                                    <input type="text" name="txtnomorakunubah" class="form-control" id="txtnomorakunubah"
                                           placeholder="Nomor akun">
                                          
                                </div>
                               
                            <div class="form-group">

                                    <div class="form-group">
                                        <label for="exampleShopStatus">Status</label>
                                        <select class="form-control" name="txtstatusubah" id="txtstatusubah">

                                            <option value="1">Aktif</option>
                                            <option value="0">Tidak aktif</option>

                                        </select>


                                    </div>
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
		
		getdata();
	});
	
	
function kosong(){
		$('#txtnamabeban').val("");
		$('#txtnomorbeban').val("");
	
	}
	function simpandata(){
	    
	   
	    
	
		    var _namabeban=$('#txtnamabeban').val();
			var _nomorakun=$('#txtnomorbeban').val();
		    var _toko=$('#txttoko').val();
		    var _status=$('#txtstatus').val();
		
          
			
		  
		  if(_namabeban==null || _namabeban=="") {
			  alert("Nama beban harus diisi!"); return;
		  }
		  
		  if(_nomorakun==null || _nomorakun=="") {
			  alert("Nomor akun harus diisi!"); return;
		  }
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('beban/simpanbeban')?>",
               // dataType : "JSON",
                data : { nama_beban:_namabeban,
					       nomor_akun:_nomorakun,
							shop_id:_toko,
							status:_status,
						
						
				
				},
                success: function(response){
					
                  
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modaltambahbeban').modal('hide');
					kosong();
                    
                },
				
            });
	}
	

	function simpanubah(){
	
		  var _namabeban=$('#txtnamabebanubah').val();
			var _nomorakun=$('#txtnomorakunubah').val();
		  	var _idakun=$('#idubah').val();
		    var _status=$('#txtstatusubah').val();
          
		  if(_namabeban==null || _namabeban=="") {
			  alert("Nama beban harus diisi!"); return;
		  }
		  
		  if(_nomorakun==null || _nomorakun=="") {
			  alert("Nomor akun harus diisi!"); return;
		  }
		 
	
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('beban/simpanubahbeban')?>",
               // dataType : "JSON",
                data : { 
						nama_beban:_namabeban,
					   nomor_akun:_nomorakun,
							id:_idakun,
						status:_status,
							
				
				},
                success: function(response){
					
                    var table = $('#list-data').DataTable();
					table.draw(false);
					
					$('#modalubahbeban').modal('hide');
                    
                },
				
            });
	}
	
	function hapus(id){
		if (confirm("Yakin hapus?")==false) return;
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('beban/hapusbeban')?>",
               // dataType : "JSON",
                data : { id:id,
						
				
				},
                success: function(response){
					
                    //alert(response);
                    if(response=="sukses"){
                        var table = $('#list-data').DataTable();
    					table.draw(false);
                    }
                    else {
                        alert("Akun ini sudah tidak bisa dihapus");
                    }
					
					
                    
                },
				
            });
	}
	
	
	
	function ubah(id){
		 	
	

	 $.ajax({
                    url : "<?php echo base_url('beban/getdatabeban');?>",
                    method : "POST",
                   data: {id:id},
                   dataType : 'json',
                    success: function(data){
						_idubah=data.id;
					  $('[name="idubah"]').val(data.id);
					   $('[name="txtnamabebanubah"]').val(data.nama_akun);
					  
                      $('[name="txtnomorakunubah"]').val(data.no_akun);
					  $('[name="txtstatus"]').val(data.status);
				      $('#modalubahbeban').modal('show');
 
                    }
                });
               
	 }
	function getdata(){
			var _toko=$('#txtshop').val();
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
         class: "center"
     }
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
     "order": [1,'asc'],
 
  "ajax":{
          url :"<?php echo base_url('beban/databebanjson'); ?>", // json datasource
          type: "post",
           data: {shop_id:_toko}
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "no_akun"},
			{ "data": "nama_akun"},
			{ "data": "namatoko"},
			
			
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function tambahbeban(){
		 $('#modaltambahbeban').modal('show');
	}
	
</script>
