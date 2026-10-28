
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
						<a href="javascript:void(0);" class="btn btn-primary float-right" onclick="tambah();">Tambah</a>
						
	</div><br><br>
	<?php }?>

	  <div class="table-responsive" style="min-height: 500px;">
	  	
    <br><table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          <th>Nama Pengeluaran</th>
          <th>Catatan</th>
          <th>Tanggal</th>
		  <th>Jumlah</th>
		  <th>Toko</th>
		  <th>Aksi</th>
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
          <h3 class="modal-title text-white">Input Pengeluaran</h3>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      
        <div class="modal-body">
         <form>
                            <div class="form-group">
                                    <label for="exampleInputCustomerName">Nama Pengeluaran</label>
                                    <input type="text" name="txtnama" class="form-control" id="txtnama"
                                           placeholder="Nama Pengeluaran">
                                </div>
                         <div class="form-group">
                                    <label for="exampleInputCustomerName">Catatan</label>
                                    <input type="text" name="txtcatatan" class="form-control" id="txtcatatan"
                                           placeholder="Catatan">
                                </div>
                               <div class="form-group">
                                    <label for="exampleInputCustomerName">Jumlah</label>
                                    <input type="number" name="txtjumlah" class="form-control" id="txtjumlah"
                                           placeholder="Jumlah pengeluaran">
                                </div>
                           <div class="form-group">
                                    <label for="exampleInputCustomerName">Tanggal</label>
                                    <input type="date" name="txttanggal" class="form-control" id="txttanggal" value="<?php echo date('Y-m-d')?>"
                                           placeholder="Tanggal">
                                </div>
                        <div class="form-group">
                                    <label for="exampleInputCustomerName">Jam</label>
                                    <input type="time" name="txtjam" class="form-control" id="txtjam" value="<?php echo date('H:i:s')?>"
                                           placeholder="Jam">
                                </div>
                                <?php
                                $idtipe=getidtipe();
                                if($idtipe==3){
                                  
                                ?>
                                <div class="form-group">

                                    <div class="form-group">
                                        <label for="exampleInputSupplier">Pilih Toko</label>
                                        <select class="form-control" name="txttoko" id="txttoko" onchange="getdatabeban(this.value);">

                                             <?php foreach($daftartoko as $u):?>
                                    <option value="<?php echo $u->id?>"><?php echo $u->namatoko?></option>
                                <?php endforeach;?>
                                </select>
                                        </div>
                                    </div>
    
    			                <?php
                                }
                                ?>
                                
                                 <div class="form-group">
                                    <label for="exampleInputCustomerName">Beban</label>
                                     <select class="form-control" name="txtbeban" id="txtbeban">
                                         </select>
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

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;
	var daftartoko =[];
    $(document).ready(function() {
			
		getdata();
	   daftartoko= <?php echo json_encode($daftartoko); ?>;
		
	
	
	});
	
	
	function getdatabeban(shop){
	   
	     $.ajax({
                type : "POST",
                url  : "<?php echo base_url('transaksi/databeban')?>",
                dataType : "json",
                data : { shop_id:shop,
						
				
				},
                success: function(response){
				
                   $("#txtbeban").empty();
                     
                        $.each(response, function(key,value){
                            $("#txtbeban").append(
                            
                            "<option value=" + value.no_akun +">"+value.nama_akun+"</option>"
                            
                            );
                            });
					
					
                    
                },
				
            });
	}
	
function simpandata(){
	    
	   var _nama=$('#txtnama').val();
	   var _jumlah=$('#txtjumlah').val();
	   var _tanggal=$('#txttanggal').val();
	   var _catatan=$('#txtcatatan').val();
	   var _toko=$('#txttoko').val();
	   var _jam=$('#txtjam').val();
        var _beban=$('#txtbeban').val();
		
		if(_nama==null || _nama=="") {
			  alert("Nama Kategori harus diisi!"); return;
		  }
		  
		  	if(_jumlah==0 || _jumlah=="") {
			  alert("Jumlah pengeluaran harus diisi!"); return;
		  }
		
		 
		
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('transaksi/simpanpengeluaran')?>",
               // dataType : "JSON",
                data : { 
					       nama:_nama,
						   catatan:_catatan,
						   jumlah:_jumlah,
						   tanggal:_tanggal,
						   toko:_toko,
						   jam:_jam,
						   beban:_beban,
						},
                success: function(response){
                    
						if(response=="sukses"){
                        alert("Data berhasil disimpan");
                        var table = $('#list-data').DataTable();
    					table.draw(false);
    					
    					$('#modaltambah').modal('hide');
    					kosong();
					}
					else {
					    alert("Gagal");
					    	$('#modaltambah').modal('hide');
					}
                    
                },
				
            });
	}	
	

	
	function getdata(shop=0){
		
		
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
	
	 {targets: [-2],
         className: 'center'
     },
     {targets: [2],
         className: 'center'
     },
	  {targets: [-1],
         visible: false
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    "order": [6,'desc'],

  "ajax":{
          url :"<?php echo base_url('transaksi/datapengeluaranjson'); ?>", // json datasource
          type: "post",
		    data : {shop_id: shop},
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "judul"},
			{ "data": "cttn"},
		
			{ "data": "tanggal"},
			{ "data": "total"},
		    { "data": "nama_toko"},
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	
	function hapuspengeluaran(id){
		if (confirm("Yakin membatalkan pengeluaran?")==false) return;
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('transaksi/hapuspengeluaran')?>",
               // dataType : "JSON",
                data : { id:id,
						
				
				},
                success: function(response){
					
                    
                    var table = $('#list-data').DataTable();
					table.draw(false);;
					
					
                    
                },
				
            });
	}
	
	function tambah(){
	   
		getdatabeban(daftartoko[0].id);
		 $('#modaltambah').modal('show');
	}
	
</script>
