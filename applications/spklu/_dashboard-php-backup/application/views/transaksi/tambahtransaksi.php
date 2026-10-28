<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.2/css/bootstrap-select.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.13.2/js/bootstrap-select.min.js"></script>
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
  
        <div class="col-12 ">
          <div class="card">
          <div class="card mb-3">
    
    <div class="card-body">
	<br>
      
            <div class="col-md-6">
               
                <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Nama</label>
                     <div class="col-md-8">
                        <select name="txtpelanggan" id="txtpelanggan" class="selectpicker form-control" data-live-search="true" data-placeholder="Pilih Satuan" required>
                           <option value="">Pilih Pelanggan</option>
                           <?php foreach($pelanggan as $u):?>
                                <option value="<?php echo $u['id']?>"><?php echo $u['nama_pelanggan']?></option>
                            <?php endforeach;?>
                        </select>
                    </div>
                </div>
               
                <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Tanggal Transaksi</label>
                    <div class="col-md-8">
                        <input type="date" id="txttanggal" class="form-control" name="txttanggal">
                    </div>
                </div>
            </div>
			
			 <div class="col-md-6">
                 <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Cara Bayar</label>
                    <div class="col-md-8">
                        <select name="txtcarabayar" id="txtcarabayar" class="form-control" data-placeholder="Pilih Satuan" required>
                           <option value="">Pilih Cara Bayar</option>
						   <option value="cod">COD</option>
						     <option value="tunai">Tunai</option>
							   <option value="transfer">Transfer</option>
                           
                        </select>
                    </div>
                </div>
				
				<div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Waktu Jemput</label>
                    <div class="col-md-8">
                        <select name="txtjemput" id="txtjemput" class="form-control" data-placeholder="Pilih Satuan" required>
                           <option value="">Pilih Waktu Jemput</option>
						    <option value="pagi">Pagi</option>
						   <option value="siang">Siang</option>
						    <option value="sore">Sore</option>
                           
                        </select>
                    </div>
                </div>
                <div class="form-group row">
                    <label for="" class="col-md-4 col-form-label">Jumlah</label>
                    <div class="col-md-8">
                        <input type="text" class="form-control text-right price" id="txtjumlah" name="txtjumlah" readonly>
                    </div>
                </div>
				
				
            </div>
           
       
		
    </div>
    <div class="card-footer">
    <button type="button" class="btn btn-primary" onclick="tambahitem();return false;">Tambah Item</button>
     <button type="button" class="btn btn-primary" onclick="simpantransaksi();return false;">Simpan</button>
	</div>
</div>
          </div>
          
        </div>
       
     <br><br>
	  <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          <th>Kode Layanan</th>
          <th>Nama Layanan</th>
          <th>Satuan</th>
          <th>Jenis</th>
		  <th>Jumlah</th>
		  <th>Harga</th>
		  <th>Aksi</th>
        
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

  <div class="modal fade" id="modaltambahdetil" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
     <div class="modal-header bg-primary">
          <h5 class="modal-title text-white">Pilih Layanan</h5>
          <button class="close" type="button" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true" class="text-white">×</span>
          </button>
        </div>
      <div class="modal-body">
	  <label class="radio-inline"><input type="radio" name="optradio" value="Kiloan" checked>Kiloan</label>
			<label class="radio-inline"><input type="radio" name="optradio" value="Satuan">Satuan</label>
			<label class="radio-inline"><input type="radio" name="optradio" value="Meteran">Meteran</label>
        <div class="table-responsive">
                <table class="table table-striped" id="table-1"  style="width:100%">
                  <thead>
                    <tr>
				     <th>Kode layanan</th>
                      <th>Nama layanan</th>
					  <th>Satuan</th>
                      <th>Harga</th>
                      <th>Jumlah</th>
					  <th>Action</th>
					  
                    </tr>
                  </thead>
                 
                </table>
              </div>
      </div>
     
    </div>
  </div>
</div>
  
<div class="modal fade" id="modalfoto" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header bg-primary">
                <h5 class="modal-title text-white"><div id="judulfoto" > Tambah Foto</div></h5>
                <button class="close" type="button" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true" class="text-white">×</span>
                </button>
            </div>
            
            <div class="modal-body">
			<input type="hidden" id="txtidtransaksi" name="txtidtransaksi">
                
				 <div class="form-group row">
                    <label for="" class="col-form-label col-md-4">File</label>
                    <div class="col-md-8"><input type="file" name="filenya" id="filenya" class="form-control"></div>
                </div>
				
               
              
            </div>
            <div class="modal-footer">
                
                <button class="btn btn-dark" type="button" data-dismiss="modal">Batal</button>
                <button class="btn btn-primary" onclick="simpanfoto();return false;">Proses</button>
            </div>
           
        </div>
    </div>
</div>
<div id="tempat-modal"></div>

<script type="text/javascript">
var jenislayanan="Kiloan";
var idtransaksi="";
var fotoke=0;
 var datatable2 ;
var araydatalayanan=[];
    $(document).ready(function() {
		
		
	});
	
	$('input:radio[name="optradio"]').change(
    function(){
        if ($(this).is(':checked')) {
			jenislayanan=$(this).val();
		
			getlayanan(jenislayanan);
			
        }
    });
	
	function konfirmasi(nama,id,satuan,kode,harga){
		var index = araydatalayanan.findIndex(x => x.kode_layanan ===kode);
		var jum=$('#'+id).val();
		if(index>-1) {
			araydatalayanan[index].jumlah=parseInt(araydatalayanan[index].jumlah) + parseInt(jum);
			//alert("Layanan ini sudah didaftarkan!");
			//return;
		}
		else {
		araydatalayanan.push({id:id,kode_layanan:kode,nama_layanan:nama,satuan:satuan,jenis_layanan:jenislayanan,
		jumlah:jum,harga:harga});
		}
		 getdataterpilih();
		

	}
	
	$('#list-data tbody').on( 'click', 'button', function () {
		
		
		 
		  
	} );
	
	function hapusbaris(id){
		
		var index = araydatalayanan.findIndex(x => x.kode_layanan ===id);
		
		  araydatalayanan.splice(index, 1);
		  getdataterpilih();
	}
	

	function numberWithCommas(x) {
			return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
		}
	
	function getjumlah(){
		var sum = araydatalayanan.map(o => o.jumlah*o.harga).reduce((a, c) => { 
		
		
		return a + c 
		});
	
		$('#txtjumlah').val(numberWithCommas(sum));
		
		
		
		
		
	}
	function getdataterpilih(){
	

	
		 datatable2=   $('#list-data').DataTable( {
      
  "processing" : true,
  'responsive': true,
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
			data: araydatalayanan,
		  columnDefs: [
			  
			 // {
				// targets: -1, 
				// data: null,
				// defaultContent: '<button href="javascript:void(0);" title="Hapus" class="btn btn-sm btn-danger" ><i class="fa fa-trash"></i></button>'
			// },
			
			 ],
			
			"ordering": true,
			"searching": true,
		  
			"bDestroy": true,
			
 
 
		
		"columns": [
			
			{ "data": "kode_layanan"},
			{ "data": "nama_layanan"},
			
			{ "data": "satuan"},
			{ "data": "jenis_layanan",},
			{ "data": "jumlah",},
		    { "data": "harga"},
			{ "data": null, "orderable": false, 
			"render": function (data, type, row, meta) { return '<div class="btn-group"> <button type="button" onclick="hapusbaris(\''+ row.kode_layanan+'\')" value="0" class="btn btn-sm btn-danger" data-toggle="modal" data-target="#myModal"><i class="fa fa-trash"></i></button></div>' } 
	
			},
			
		],
		
		"footerCallback": function (row, data, start, end, display) { 
				
                if ( araydatalayanan.length >0) {
				 getjumlah();
				
				}
				else $('#txtjumlah').val(numberWithCommas(""));
              
       }
  
  });
  
  
	}
	function tambahitem(){
	
	
	$('#modaltambahdetil').modal('show');
	getlayanan(jenislayanan);
	
}

function getlayanan(jenis){
		
		var datatable=   $('#table-1').DataTable( {
      
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
	 // {
        // targets: [3],
        // className: 'right'
     // },
	  {
        targets: [-2,-1,3],
        className: 'center'
     },
	 
		
	 // {
        // targets: 3,
        // render: $.fn.dataTable.render.number(',', '.', 0, '')
    // },
	 
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('transaksi/datalayananjson'); ?>", // json datasource
          type: "post",
		  data : {jenis_layanan: jenis},		  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "kode_layanan"},
			{ "data": "nama_layanan"},
			{ "data": "satuan"},
			{ "data": "harga_jual"},
			{ "data": "jumlah"},
			{ "data": "aksi"},
			
			
		]
  
  });
  

	}
	
	function simpantransaksi(){
	
	var _idpelanggan=$('#txtpelanggan').val();
	
	var _tanggal=$('#txttanggal').val();
	var _carabayar=$('#txtcarabayar').val();
	var _jumlah=parseFloat( $('#txtjumlah').val().replace(/,/g,''));
	var _waktujemput=$('#txtjemput').val();
	 
	if(_idpelanggan==""|| _idpelanggan==null) {
		alert("Isi dulu Data Pelanggan"); return;
	}
	
	if(_tanggal==""|| _tanggal==null) {
		alert("Isi dulu tanggal transaksi"); return;
	}
	
	
	if(_carabayar==""|| _carabayar==null) {
		alert("Cara bayar harus diisi"); return;
	}
	
	if(araydatalayanan.length==0) {
		alert("Isi dulu Layanan"); return;
	}
	
	if(_waktujemput==""|| _waktujemput==null) {
		alert("Waktu jemput harus diisi"); return;
	}
	
	
            $.ajax({
                type : "POST",
                url  : "<?php echo base_url('transaksi/simpantransaksi')?>",
               // dataType : "JSON",
                data : { 
				id_pelanggan:_idpelanggan,
				tgl_transaksi:_tanggal,
				cara_bayar:_carabayar,
				jumlah:_jumlah,
				waktu_jemput:_waktujemput,
				detil: JSON.stringify(araydatalayanan)
				},
                success: function(response){
					
					if(response>0){
						idtransaksi=response;
					alert("Order Laundry berhasil di simpan");
					$('#modalfoto').modal('show');
					$('#judulfoto').text("Tambah Foto "+ (fotoke+1));
					//window.location.href = "<?php echo base_url('transaksi/datatransaksi')?>";
					
					}
				},
				
            });
	
		}
	
	function numberWithCommas(x) {
			return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
		}
		
		
		function simpanfoto() {
	
			var _idtransaksi=idtransaksi;

			
			var foto=$('#filenya')[0].files[0];
			
			  var files = new FormData(); // you can consider this as 'data bag'
				 files.append('fileName', $('#filenya')[0].files[0]); // append selected file to the bag named 'file'
			files.append("id_transaksi",_idtransaksi);
			files.append("fotoke",fotoke);
        
				   
					$.ajax({
						type : "POST",
						url  : "<?php echo base_url('transaksi/simpanfoto')?>",
					   // dataType : "JSON",
						data : files,
						processData: false,
						contentType: false,
						success: function(response){
						
							if(response=="sukses"){
								if(fotoke>=2) {
								$('#modalfoto').modal('hide');
								window.location.href = "<?php echo base_url('transaksi/datatransaksi')?>";
								}
								else{ 
								$('#modalfoto').modal('show');
								
								}
								fotoke++;
								$('#judulfoto').text("Tambah Foto "+ (fotoke+1));
							}
						//else alert(response);
							
							
						},
						
					});
	
		}
	
</script>
