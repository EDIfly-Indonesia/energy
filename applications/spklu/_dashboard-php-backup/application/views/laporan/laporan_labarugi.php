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
    <select name="txtshop" id="txtshop" class="form-control" data-placeholder="Pilih Toko" onchange="getdata();" required>
                           <option value="0">Semua</option>
                          <?php foreach($daftartoko as $u):?>
                                <option value="<?php echo $u->id?>"><?php echo $u->namatoko?></option>
                            <?php endforeach;?>
                        </select>
                        </div>
     </div>
  
  <div class="form-group row">
   
    <div class="col-md-6">
         <div class="form-group row">
            <label class="col-md-3"><input type="radio" name="optjeniswaktu" value="0">&nbsp; Bulanan</label>
                    
                     <div class="col-md-4">
                       <select name="txtbulan" id="txtbulan" class="form-control" data-placeholder="Pilih Bulan" onchange="getdata()" required>
                          
                           
                        </select>
                    </div>
                    
                    <div class="col-md-4">
                      <select name="txttahun" id="txttahun" class="form-control" data-placeholder="Pilih Tahun" onchange="getdata()" required>-->
                          
                           
                      </select>
                    </div>
                    
                </div>
    </div>
  
   <div class="col-md-6">
         <div class="form-group row">
            <label class="col-md-2"><input type="radio" name="optjeniswaktu" value="1">&nbsp; Harian</label>
                    
                     <div class="col-md-3">
                      <input type="date" id="tgl1" name="tgl1" value="<?php echo date('Y-m-d'); ?>">
                    </div>
                   <div class="col-md-1">sd
                       </div>
                    <div class="col-md-3">
                      <input type="date" id="tgl2" name="tgl2" value="<?php echo date('Y-m-d'); ?>">
                    </div>
                    <div class="col-md-3"><button type="button" class="btn btn-primary" onclick="getdata();";>Lihat</button>
                       </div>
                </div>
    </div>
    </div>

	  <div class="table-responsive" style="min-height: 500px;">
	  	
    <br><table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          
          <th>Toko</th>
		  <th>Total Transaksi</th>
		   <th>Total HPP</th>
		  <th>Total beban</th>
          <th>Laba/Rugi</th>
		  <th>Aksi</th>
		   
         
        </tr>
      </thead>
     <tfoot align="right">
		<tr><th></th><th></th><th></th><th></th><th></th><th></th></tr>
	</tfoot>
    </table>
	</div>
  </div>
</div>

 
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;

var vjeniswaktu=0;
var bulan=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    $(document).ready(function() {
		 var html = "";
		var ket="";
		const d = new Date();
		let month = d.getMonth()+1;
		let year = d.getFullYear();
		
							for(i=1; i<=12; i++){
								
								if(i==month) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+bulan[(i-1)]+'</option>';
							ket="";
							
							
						
						}
					
		
		$('#txtbulan').html(html);
		html="";
		for(i=2021; i<=2100; i++){
								
								if(i==year) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+i+'</option>';
							ket="";
							
							
						
						}	
			$('#txttahun').html(html);
			document.querySelector("input[value='"+vjeniswaktu+"']").checked = true;
		getdata();
	});
	
		$('input:radio[name="optjeniswaktu"]').change(
    function(){
        if ($(this).is(':checked')) {
			vjeniswaktu=$(this).val();
		if(vjeniswaktu==0)	getdata();
        }
    });
	
	
	function excel(shop,namatoko){
	   // alert(namatoko);return;
	            var _tanggal1=$('#tgl1').val();
        		var _tanggal2=$('#tgl2').val();
        		var _toko=$('#txtshop').val();
        		var _bulan=$('#txtbulan').val();
        		var _tahun=$('#txttahun').val();
        		var _url="<?php echo base_url('laporan/excellabarugi?shop_id=') ?>"+shop +"&bulan=" +_bulan +"&tahun=" + _tahun +"&tanggal1=" + _tanggal1 +"&tanggal2=" + _tanggal2 +
        		"&jeniswaktu=" + vjeniswaktu +"&namatoko=" + namatoko;
        		
        		 window.open(_url);
        // 		
	}
	
	
	function getdata(){
		
		var _tanggal1=$('#tgl1').val();
		var _tanggal2=$('#tgl2').val();
		var _toko=$('#txtshop').val();
		var _bulan=$('#txtbulan').val();
		var _tahun=$('#txttahun').val();
		
	
		var datatable=   $('#list-data').DataTable( {
     dom: 'Blfrtip',
        buttons: [
            { extend: 'copy', footer: true,
				exportOptions: {
                    columns: [0,1,2,3,4  ]
                }				},
            { extend: 'excel', footer: true,
			filename : "labarugi",
				exportOptions: {
                    columns: [ 0,1,2,3,4 ]
                }			},
            { extend: 'pdf', footer: true,
			filename : "labarugi",
				exportOptions: {
                    columns: [ 0,1,2,3,4  ]
                }				},
            { extend: 'csv', footer: true ,
			filename : "labarugi",
				exportOptions: {
                    columns: [ 0,1,2,3,4]
                }	
			}
      
        
    ],
    
     

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
        targets: [0,-1],
        orderable: false
     },
	{targets: [-1],
         className: 'center'
     },
	 {targets: [-1,-2,-3,-4,1],
         className: 'right'
     },
      {targets: -2,
                    render: function ( data, type, row ) {
                      var color = 'blue';
                      if (parseInt(data) <0) {
                        color = 'red';
                      } 
                     // else  color = 'blue';
                      return '<span style="color:' + color + '">' + data + '</span>';
                    }
               }
// 	  {targets: [-1,-2],
//          visible: false
//      },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('laporan/labarugijson'); ?>", // json datasource
          type: "post",
		    data : {shop_id: _toko,
		        jeniswaktu: vjeniswaktu,
		        tanggal1: _tanggal1,
		        tanggal2: _tanggal2,
		        bulan: _bulan,
		        tahun: _tahun},
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "namatoko"},
			{ "data": "transaksi"},
			{ "data": "modal"},
			{ "data": "beban"},
			{ "data": "untung"},
			{ "data": "aksi"},
		]
  
  });
 
	}
	

</script>
