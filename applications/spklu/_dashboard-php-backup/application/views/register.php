<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>AdminCRUD | Log in</title>
    <!-- Tell the browser to be responsive to screen width -->
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
    <!-- Bootstrap 3.3.6 -->
    <link rel="stylesheet" href="<?php echo base_url(); ?>assets/bootstrap/css/bootstrap.min.css">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="<?php echo base_url(); ?>assets/eksternal/font-awesome.min.css">
    <!-- Ionicons -->
    <link rel="stylesheet" href="<?php echo base_url(); ?>assets/eksternal/ionicons.min.css">
    <!-- Theme style -->
    <link rel="stylesheet" href="<?php echo base_url(); ?>assets/dist/css/AdminLTE.min.css">
    <!-- iCheck -->
    <link rel="stylesheet" href="<?php echo base_url(); ?>assets/plugins/iCheck/square/blue.css">

    <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/html5shiv/3.7.3/html5shiv.min.js"></script>
    <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->
  </head>
  <body class="hold-transition login-page">
    <div class="login-box">
      <div class="login-logo">
        <a href="<?php echo base_url(); ?>assets/index2.html">Pendaftaran Mahasiswa Baru</a>
      </div>

      <!-- /.login-logo -->
      <div class="login-box-body">
        <p class="login-box-msg">
           Isi Data dibawah dengan Benar
        </p>

        <form action="<?php echo base_url('Auth/prosesregister'); ?>" method="post">
		<input type="hidden" class="form-control" placeholder="Username" name="txtotp1" id="txtotp1">
          <div class="form-group has-feedback">
            <input type="text" class="form-control" placeholder="Nama Lengkap" name="txtnama">
            <span class="glyphicon glyphicon-user form-control-feedback"></span>
          </div>
				  <div class="input-group">
		  <input type="text" class="form-control"  placeholder="Email" name="txtemail" id="txtemail">
		  <span class="input-group-btn">
			<button class="btn btn-default" type="button" onclick="kirimotp();">Kirim OTP</button>
		  </span>
		</div>

	<div class="form-group has-feedback">
            <input type="password" class="form-control" placeholder="OTP dari Email" name="txtotp2" required>
            <span class="glyphicon glyphicon-lock form-control-feedback"></span>
          </div>
		  <div class="form-group has-feedback">
            <input type="password" class="form-control" placeholder="Password" name="txtpass">
            <span class="glyphicon glyphicon-lock form-control-feedback"></span>
          </div>
		   <div class="form-group has-feedback">
            <input type="text" class="form-control" placeholder="No.HP" name="txthp">
            <span class="glyphicon glyphicon-phone form-control-feedback"></span>
          </div>
		   <div class="form-group has-feedback">
            <input type="text" class="form-control" placeholder="Asal Sekolah" name="txtsekolah">
            <span class="glyphicon glyphicon-education form-control-feedback"></span>
          </div>
		  <div class="form-group has-feedback">
             <select id="txtwn"  name="txtwn" class="form-control" data-placeholder="Pilih WN">
                                <option>Warga Negara</option>
                                
                                    <option value="WNI">WNI</option>
									 <option value="WNA">WNA</option>
                                
                            </select>
            <span class="glyphicon glyphicon-home form-control-feedback"></span>
          </div>
		  
		   <div class="form-group has-feedback">
             <select id="txtprodi"  name="txtprodi" class="form-control" onChange="getkota();" data-placeholder="Provinsi">
                                <option>Pilihan Program Studi</option>
                                <?php foreach($program as $l):?>
                                    <option value="<?php echo $l['id_prodi']?>"><?php echo $l['nama_kampus']."-".$l['nama_prodi']?></option>
                                <?php endforeach;?>
                            </select>
            <span class="glyphicon glyphicon-briefcase form-control-feedback"></span>
          </div>
		   <div class="form-group has-feedback">
             <select id="txttempat" name="txttempat" class="form-control" onChange="getkota();" data-placeholder="Provinsi">
                                <option>Lokasi Ujian</option>
                                <?php foreach($kampus as $l):?>
                                    <option value="<?php echo $l->kode_kampus?>"><?php echo $l->nama_kampus?></option>
                                <?php endforeach;?>
                            </select>
            <span class="glyphicon glyphicon-pencil form-control-feedback"></span>
          </div>
          <div class="row">
            <!-- <div class="col-xs-8">
              <div class="checkbox icheck">
                <label>
                  <input type="checkbox"> Remember Me
                </label>
              </div>
            </div> -->
            <div class="col-xs-offset-8 col-xs-4">
              <button type="submit" class="btn btn-primary btn-block btn-flat">Register</button>
            </div>
          </div>
        </form>

        <!-- <div class="social-auth-links text-center">
          <p>- OR -</p>
          <a href="#" class="btn btn-block btn-social btn-facebook btn-flat"><i class="fa fa-facebook"></i> Sign in using
            Facebook</a>
          <a href="#" class="btn btn-block btn-social btn-google btn-flat"><i class="fa fa-google-plus"></i> Sign in using
            Google+</a>
        </div> -->
        <!-- /.social-auth-links -->

        <!-- <a href="#">I forgot my password</a><br>
        <a href="register.html" class="text-center">Register a new membership</a> -->

      </div>
      <!-- /.login-box-body -->
      <?php
        echo show_err_msg($this->session->flashdata('error_msg'));
      ?>
    </div>
    

    <!-- /.login-box -->

    <!-- jQuery 2.2.3 -->
    <script src="<?php echo base_url(); ?>assets/plugins/jQuery/jquery-2.2.3.min.js"></script>
    <!-- Bootstrap 3.3.6 -->
    <script src="<?php echo base_url(); ?>assets/bootstrap/js/bootstrap.min.js"></script>
    <!-- iCheck -->
    <!-- <script src="<?php echo base_url(); ?>assets/plugins/iCheck/icheck.min.js"></script> -->
    <!-- <script>
      $(function () {
        $('input').iCheck({
          checkboxClass: 'icheckbox_square-blue',
          radioClass: 'iradio_square-blue',
          increaseArea: '20%' // optional
        });
      });
    </script> -->
  </body>
</html>

<script>

function kirimotp(){
	var _email=$('#txtemail').val();
	
	
	$.ajax({
                    url : "<?php echo base_url('Auth/kirimotp');?>",
                    method : "POST",
                    data : {email:_email,
							 
							},
                   
                  
                    success: function(data){
					//	alert(data);
					$('#txtotp1').val(data);
					alert("SIlahkan cek email anda");
					}
                });
	
		}

</script>
