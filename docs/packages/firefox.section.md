# Firefox {#sec-firefox}

## Construir Firefox empacotado com extensões e políticas {#build-wrapped-firefox-with-extensions-and-policies}

A função `wrapFirefox` permite passar políticas, preferências e extensões que estão disponíveis para o Firefox. Com a ajuda de `fetchFirefoxAddon`, isso permite construir uma versão do Firefox que já vem com add-ons pré-instalados:

```nix
{
  # Add-ons do Nix para Firefox só funcionam com o pacote firefox-esr.
  myFirefox = wrapFirefox firefox-esr-unwrapped {
    nixExtensions = [
      (fetchFirefoxAddon {
        name = "ublock"; # Deve ser único!
        url = "https://addons.mozilla.org/firefox/downloads/file/3679754/ublock_origin-1.31.0-an+fx.xpi";
        hash = "sha256-2e73AbmYZlZXCP5ptYVcFjQYdjDp4iPoEPEOSCVF5sA=";
      })
    ];

    extraPolicies = {
      CaptivePortal = false;
      DisableFirefoxStudies = true;
      DisablePocket = true;
      DisableTelemetry = true;
      DisableFirefoxAccounts = true;
      FirefoxHome = {
        Pocket = false;
        Snippets = false;
      };
      UserMessaging = {
        ExtensionRecommendations = false;
        SkipOnboarding = true;
      };
      SecurityDevices = {
        # Use um módulo proxy em vez de `nixpkgs.config.firefox.smartcardSupport = true`
        "PKCS#11 Proxy Module" = "${pkgs.p11-kit}/lib/p11-kit-proxy.so";
      };
    };

    extraPrefs = ''
      // Mostrar mais informações de certificado ssl
      lockPref("security.identityblock.show_extended_validation", true);
    '';
  };
}
```

Se `nixExtensions != null`, então todos os add-ons instalados manualmente serão desinstalados do seu perfil de navegador.
Para visualizar as políticas empresariais disponíveis, visite [políticas empresariais](https://github.com/mozilla/policy-templates#enterprisepoliciesenabled) ou digite na barra de URL do Firefox: `about:policies#documentation`.
Add-ons instalados pelo Nix não possuem uma assinatura válida, razão pela qual a verificação de assinatura é desabilitada. Isso não compromete a segurança porque os add-ons baixados são verificados por checksum e add-ons manuais não podem ser instalados. Além disso, certifique-se de que o campo `name` de `fetchFirefoxAddon` seja único. Se você remover um add-on do array `nixExtensions`, reconstrua e inicie o Firefox: o add-on removido será completamente removido com todas as suas configurações.

## Solução de Problemas {#sec-firefox-troubleshooting}
Se os add-ons estiverem marcados como quebrados ou a assinatura for inválida, certifique-se de ter o Firefox ESR instalado. O Firefox normal não oferece mais a capacidade de desabilitar a verificação de assinatura para add-ons; assim, os add-ons do Nix são desabilitados pelo binário normal do Firefox.

Se os add-ons não aparecerem instalados apesar de estarem definidos no seu arquivo de configuração nix, redefina o estado local dos add-ons do seu perfil do Firefox clicando em `Ajuda -> Mais informações para resolução de problemas -> Reiniciar Firefox`. Isso pode acontecer se você alternar do modo de add-on manual para o modo de add-on nix e depois voltar para o modo manual e, em seguida, novamente para o modo de add-on nix.