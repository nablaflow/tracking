{
  pkgs,
  lib,
  ...
}:
let
  node-modules = pkgs.importNpmLock.buildNodeModules {
    package = lib.importJSON ./package.json;
    packageLock = lib.importJSON ./package-lock.json;
    inherit (pkgs) nodejs;

    # Do not run the install scripts of the dependencies (core-js, fsevents).
    # Keep in sync with .npmrc.
    derivationArgs.npmRebuildFlags = [ "--ignore-scripts" ];
  };
in
{
  # biome and nixfmt are also on the PATH for the VS Code extensions.
  packages = with pkgs; [
    git
    biome
    nixfmt
  ];

  # Disable devenv cachix integration on the CI because it's already handled by
  # the cachix github action, and having both enabled makes it slow.
  cachix.enable = false;
  cachix.push = lib.mkIf ((builtins.getEnv "CI") == "") "nablaflow";

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs;
    npm.enable = true;
  };

  treefmt = {
    enable = true;
    config.programs = {
      nixfmt.enable = true;
      statix.enable = true;
      deadnix.enable = true;
      biome = {
        enable = true;
        # The biome binary validates the config itself, so this is redundant.
        validate.enable = false;
        # treefmt-nix's biome requires settings to be written in nix and ignores
        # ./biome.json.
        settings = lib.recursiveUpdate (lib.importJSON ./biome.json) {
          # vcs is disabled because treefmt already honours .gitignore.
          vcs.enabled = false;
        };
      };
    };
  };

  scripts = {
    # CI runs without a node_modules directory, so link the Nix one. Remove the
    # link on exit, so that a later `npm install` does not write to the
    # read-only Nix store.
    vitest-run.exec = ''
      if [ ! -e node_modules ]; then
        ln -s ${node-modules}/node_modules node_modules
        trap 'rm -f node_modules' EXIT
      fi
      ${node-modules}/node_modules/.bin/vitest run
    '';
  };

  # The treefmt module formats the files before each shell starts. On the CI,
  # this fixes the files before `treefmt --ci` checks them. Run treefmt by hand.
  tasks."devenv:treefmt:run".before = lib.mkForce [ ];

  enterTest = ''
    echo "Running tests"
    treefmt --ci
    vitest-run
  '';
}
